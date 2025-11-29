import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

interface ExistingMedia {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string;
}

const EditComplaint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [newVideoPreview, setNewVideoPreview] = useState<string | null>(null);
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([]);
  const [mediaToDelete, setMediaToDelete] = useState<ExistingMedia[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
  });

  // Fetch complaint details
  const { data: complaint, isLoading: complaintLoading } = useQuery({
    queryKey: ['complaint-for-edit', id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', id)
        .eq('student_id', user.id)
        .eq('status', 'Pending')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  // Fetch existing media
  const { data: fetchedMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ['complaint-media-for-edit', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('complaint_media')
        .select('*')
        .eq('complaint_id', id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Set form values when complaint is loaded
  useEffect(() => {
    if (complaint) {
      reset({
        title: complaint.title,
        category: complaint.category as any,
        description: complaint.description,
        location: complaint.location || '',
        urgency: complaint.urgency as any,
      });
    }
  }, [complaint, reset]);

  // Set existing media when loaded
  useEffect(() => {
    if (fetchedMedia) {
      setExistingMedia(fetchedMedia);
    }
  }, [fetchedMedia]);

  const isLoading = complaintLoading || mediaLoading;

  const existingImages = existingMedia.filter(m => m.file_type.startsWith('image') || m.file_type === 'image');
  const existingVideos = existingMedia.filter(m => m.file_type.startsWith('video') || m.file_type === 'video');
  const totalImages = existingImages.length + newImages.length;
  const hasVideo = existingVideos.length > 0 || newVideo !== null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + totalImages > 3) {
      toast.error('Maximum 3 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(file.name + ' is not an image');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(file.name + ' is too large (max 5MB)');
        return false;
      }
      return true;
    });

    setNewImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews(prev => [...prev, reader.result as string]);
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

    setNewVideo(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewVideoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewVideo = () => {
    setNewVideo(null);
    setNewVideoPreview(null);
  };

  const removeExistingMedia = (media: ExistingMedia) => {
    setExistingMedia(prev => prev.filter(m => m.id !== media.id));
    setMediaToDelete(prev => [...prev, media]);
  };

  const uploadNewFiles = async (complaintId: string) => {
    const mediaUrls: Array<{ url: string; type: string; name: string }> = [];

    // Upload new images
    for (const image of newImages) {
      const fileExt = image.name.split('.').pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = complaintId + '/' + timestamp + '_' + randomStr + '.' + fileExt;
      
      const { error } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, image);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName);

      mediaUrls.push({ url: publicUrl, type: 'image', name: image.name });
    }

    // Upload new video
    if (newVideo) {
      const fileExt = newVideo.name.split('.').pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = complaintId + '/' + timestamp + '_' + randomStr + '.' + fileExt;
      
      const { error } = await supabase.storage
        .from('complaint-videos')
        .upload(fileName, newVideo);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-videos')
        .getPublicUrl(fileName);

      mediaUrls.push({ url: publicUrl, type: 'video', name: newVideo.name });
    }

    return mediaUrls;
  };

  const deleteMediaFiles = async () => {
    for (const media of mediaToDelete) {
      // Delete from storage
      const url = new URL(media.file_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('storage') + 2;
      const bucket = pathParts[bucketIndex];
      const filePath = pathParts.slice(bucketIndex + 1).join('/');
      
      if (bucket && filePath) {
        await supabase.storage.from(bucket).remove([filePath]);
      }

      // Delete from database
      await supabase
        .from('complaint_media')
        .delete()
        .eq('id', media.id);
    }
  };

  const onSubmit = async (data: ComplaintFormData) => {
    if (!user || !id) {
      toast.error('Unable to update complaint');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update complaint
      const { error: updateError } = await supabase
        .from('complaints')
        .update({
          title: data.title,
          category: data.category,
          description: data.description,
          location: data.location || null,
          urgency: data.urgency,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Delete removed media
      if (mediaToDelete.length > 0) {
        await deleteMediaFiles();
      }

      // Upload new files
      if (newImages.length > 0 || newVideo) {
        const mediaUrls = await uploadNewFiles(id);
        
        // Insert new media records
        for (const media of mediaUrls) {
          const { error: mediaError } = await supabase
            .from('complaint_media')
            .insert({
              complaint_id: id,
              file_url: media.url,
              file_type: media.type,
              file_name: media.name,
            });

          if (mediaError) throw mediaError;
        }
      }

      toast.success('Complaint updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['student-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint', id] });
      navigate('/student/dashboard');
    } catch (error: any) {
      console.error('Error updating complaint:', error);
      toast.error(error.message || 'Failed to update complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Complaint Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This complaint may have been deleted or is no longer editable.
          </p>
          <Button onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const handleTitleTranscript = (text: string) => {
    const el = document.getElementById('title') as HTMLInputElement;
    const currentValue = el?.value || '';
    setValue('title', currentValue ? currentValue + ' ' + text : text);
  };

  const handleDescriptionTranscript = (text: string) => {
    const el = document.getElementById('description') as HTMLTextAreaElement;
    const currentValue = el?.value || '';
    setValue('description', currentValue ? currentValue + ' ' + text : text);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Edit Complaint</h1>
          <p className="text-muted-foreground mb-6">
            Update your complaint details below. Only pending complaints can be edited.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title *</Label>
                <VoiceInputButton onTranscript={handleTitleTranscript} />
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
                <VoiceInputButton onTranscript={handleDescriptionTranscript} />
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

            {/* Existing Media */}
            {existingMedia.length > 0 && (
              <div>
                <Label>Current Attachments</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {existingImages.map((media) => (
                    <div key={media.id} className="relative">
                      <img
                        src={media.file_url}
                        alt={media.file_name}
                        className="w-full h-24 object-cover rounded-md border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingMedia(media)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/15 flex items-center justify-center transition-all duration-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {existingVideos.map((media) => (
                  <div key={media.id} className="relative mt-4">
                    <video
                      src={media.file_url}
                      controls
                      className="w-full max-h-64 rounded-md border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingMedia(media)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/15 flex items-center justify-center transition-all duration-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Images Upload */}
            <div>
              <Label>Add Photos (Max {3 - existingImages.length} more)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  disabled={totalImages >= 3}
                />
                <label
                  htmlFor="image-upload"
                  className={"flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-accent/50 hover:bg-accent/10 transition-all duration-200 " + (totalImages >= 3 ? "opacity-50 cursor-not-allowed" : "")}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Upload Images ({totalImages}/3)</span>
                </label>
              </div>

              {newImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {newImagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={"New " + (index + 1)}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/15 flex items-center justify-center transition-all duration-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New Video Upload */}
            {!hasVideo && (
              <div>
                <Label>Add Video (Max 50MB)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                    disabled={hasVideo}
                  />
                  <label
                    htmlFor="video-upload"
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-accent/50 hover:bg-accent/10 transition-all duration-200"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Upload Video</span>
                  </label>
                </div>

                {newVideoPreview && (
                  <div className="relative mt-4">
                    <video
                      src={newVideoPreview}
                      controls
                      className="w-full max-h-64 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={removeNewVideo}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/15 flex items-center justify-center transition-all duration-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

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
                    Updating...
                  </>
                ) : (
                  'Update Complaint'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditComplaint;
