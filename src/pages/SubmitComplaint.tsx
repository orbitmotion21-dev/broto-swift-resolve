import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import VoiceInputButton from '@/components/VoiceInputButton';

const complaintSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  category: z.enum(['Hostel', 'Internet', 'System', 'Food', 'Behaviour', 'Others']),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  location: z.string().max(200, 'Location must be less than 200 characters').optional(),
  urgency: z.enum(['Low', 'Medium', 'High']),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      urgency: 'Medium',
      category: 'System',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 3) {
      toast.error('Maximum 3 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video size must be less than 50MB');
      return;
    }

    setVideo(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideo(null);
    setVideoPreview(null);
  };

  const uploadFiles = async (complaintId: string) => {
    const mediaUrls: Array<{ url: string; type: string; name: string }> = [];

    // Upload images
    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${complaintId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, image);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName);

      mediaUrls.push({ url: publicUrl, type: 'image', name: image.name });
    }

    // Upload video
    if (video) {
      const fileExt = video.name.split('.').pop();
      const fileName = `${complaintId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('complaint-videos')
        .upload(fileName, video);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-videos')
        .getPublicUrl(fileName);

      mediaUrls.push({ url: publicUrl, type: 'video', name: video.name });
    }

    return mediaUrls;
  };

  const onSubmit = async (data: ComplaintFormData) => {
    if (!user) {
      toast.error('You must be logged in to submit a complaint');
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert complaint
      const { data: complaint, error: complaintError } = await supabase
        .from('complaints')
        .insert({
          student_id: user.id,
          title: data.title,
          category: data.category,
          description: data.description,
          location: data.location || null,
          urgency: data.urgency,
          status: 'Pending',
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      // Upload files if any
      if (images.length > 0 || video) {
        const mediaUrls = await uploadFiles(complaint.id);
        
        // Insert media records
        for (const media of mediaUrls) {
          const { error: mediaError } = await supabase
            .from('complaint_media')
            .insert({
              complaint_id: complaint.id,
              file_url: media.url,
              file_type: media.type,
              file_name: media.name,
            });

          if (mediaError) throw mediaError;
        }
      }

      // Create notification for admins
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          complaint_id: complaint.id,
          type: 'new_complaint',
          message: `New complaint submitted: ${data.title}`,
        });

      if (notificationError) console.error('Notification error:', notificationError);

      toast.success('Complaint submitted successfully!');
      navigate('/student/dashboard');
    } catch (error: any) {
      console.error('Error submitting complaint:', error);
      toast.error(error.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/student/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="p-6 md:p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Submit New Complaint</h1>
          <p className="text-muted-foreground mb-6">
            Fill out the form below to submit your complaint. We'll review it as soon as possible.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title *</Label>
                <VoiceInputButton 
                  onTranscript={(text) => {
                    const currentValue = (document.getElementById('title') as HTMLInputElement)?.value || '';
                    setValue('title', currentValue ? `${currentValue} ${text}` : text);
                  }}
                />
              </div>
              <Input
                id="title"
                {...register('title')}
                placeholder="Brief description of the issue"
                className="mt-1"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                {...register('category')}
                className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="System">System</option>
                <option value="Hostel">Hostel</option>
                <option value="Internet">Internet</option>
                <option value="Food">Food</option>
                <option value="Behaviour">Behaviour</option>
                <option value="Others">Others</option>
              </select>
              {errors.category && (
                <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description *</Label>
                <VoiceInputButton 
                  onTranscript={(text) => {
                    const currentValue = (document.getElementById('description') as HTMLTextAreaElement)?.value || '';
                    setValue('description', currentValue ? `${currentValue} ${text}` : text);
                  }}
                />
              </div>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Provide detailed information about your complaint"
                className="mt-1 min-h-[120px]"
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="e.g., Room 301, Block A"
                className="mt-1"
              />
              {errors.location && (
                <p className="text-sm text-destructive mt-1">{errors.location.message}</p>
              )}
            </div>

            <div>
              <Label>Urgency *</Label>
              <div className="flex gap-4 mt-2">
                {['Low', 'Medium', 'High'].map((level) => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={level}
                      {...register('urgency')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{level}</span>
                  </label>
                ))}
              </div>
              {errors.urgency && (
                <p className="text-sm text-destructive mt-1">{errors.urgency.message}</p>
              )}
            </div>

            <div>
              <Label>Photos (Optional, Max 3)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  disabled={images.length >= 3}
                />
                <label
                  htmlFor="image-upload"
                  className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-accent transition-colors ${
                    images.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Upload Images ({images.length}/3)</span>
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Video (Optional, Max 50MB)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                  id="video-upload"
                  disabled={!!video}
                />
                <label
                  htmlFor="video-upload"
                  className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-accent transition-colors ${
                    video ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">{video ? 'Video Selected' : 'Upload Video'}</span>
                </label>
              </div>

              {videoPreview && (
                <div className="relative mt-4">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full max-h-64 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/student/dashboard')}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Complaint'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SubmitComplaint;
