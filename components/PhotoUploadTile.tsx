'use client';

import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { compressPhoto } from '@/lib/photoCompress';

type UploadState = 'empty' | 'compressing' | 'uploading' | 'approved' | 'rejected';

interface Props {
  boardId: string;
  onPhotoReady?: (url: string | null) => void;
}

export function PhotoUploadTile({ boardId, onPhotoReady }: Props) {
  const [state, setState] = useState<UploadState>('empty');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setState('empty');
    setPhotoUrl(null);
    setThumbnail(null);
    onPhotoReady?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    // Show local thumbnail immediately for visual feedback
    setThumbnail(URL.createObjectURL(file));

    setState('compressing');
    let blob: Blob;
    try {
      blob = await compressPhoto(file);
    } catch {
      setState('rejected');
      onPhotoReady?.(null);
      return;
    }

    setState('uploading');
    try {
      const form = new FormData();
      form.append('photo', blob, 'photo.jpg');
      form.append('boardId', boardId);

      const res = await fetch('/api/photos/upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok || !json.photoUrl) {
        setState('rejected');
        onPhotoReady?.(null);
        return;
      }

      setPhotoUrl(json.photoUrl);
      setState('approved');
      onPhotoReady?.(json.photoUrl);
    } catch {
      setState('rejected');
      onPhotoReady?.(null);
    }
  };

  const baseClass =
    'w-full rounded-card border-2 flex flex-col items-center justify-center gap-2 py-8 transition-colors relative overflow-hidden';

  if (state === 'approved' && thumbnail) {
    return (
      <div className={`${baseClass} border-transparent p-0 py-0`} style={{ height: 140 }}>
        <img
          src={thumbnail}
          alt="Court photo preview"
          className="w-full h-full object-cover rounded-card"
        />
        <button
          onClick={reset}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-brand-text/70 flex items-center justify-center text-white"
          aria-label="Remove photo"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state === 'compressing' || state === 'uploading') {
    return (
      <div className={`${baseClass} border-dashed border-brand-gray/40 text-brand-gray`}>
        <span className="w-6 h-6 border-2 border-brand-gray/40 border-t-brand-gray rounded-full animate-spin" />
        <span className="text-sm">{state === 'compressing' ? 'Compressing…' : 'Uploading…'}</span>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <button
        onClick={() => inputRef.current?.click()}
        className={`${baseClass} border-dashed border-brand-terracotta/50 text-brand-terracotta`}
      >
        <Camera size={24} />
        <span className="text-sm text-center px-4">
          Photo couldn't be uploaded — tap to try another
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </button>
    );
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      className={`${baseClass} border-dashed border-brand-gray/40 text-brand-gray`}
    >
      <Camera size={24} />
      <span className="text-sm">Add a photo (optional)</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </button>
  );
}
