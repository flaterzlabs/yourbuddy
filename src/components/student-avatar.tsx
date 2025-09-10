interface StudentAvatarProps {
  seed?: string;
  size?: number;
  className?: string;
}

export function StudentAvatar({ seed, size = 40, className = "" }: StudentAvatarProps) {
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

  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <img
      src={avatarUrl}
      alt="Avatar do estudante"
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}