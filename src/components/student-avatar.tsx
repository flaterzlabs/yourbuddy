interface StudentAvatarProps {
  imageUrl?: string;
  seed?: string;
  style?: string;
  size?: number;
  className?: string;
}

export function StudentAvatar({
  imageUrl,
  seed,
  style = 'thumbs',
  size = 40,
  className = '',
}: StudentAvatarProps) {
  // Prioritize imageUrl, then fallback to seed/style generation
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Student avatar"
        className={`rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!seed) {
    return (
      <div
        className={`rounded-full bg-muted flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-muted-foreground text-sm">?</span>
      </div>
    );
  }

  const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <img
      src={avatarUrl}
      alt="Student avatar"
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
