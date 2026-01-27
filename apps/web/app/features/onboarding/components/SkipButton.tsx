import { Button } from '@ui/components/Button';

interface SkipButtonProps {
  onClick: () => void;
}

export function SkipButton({ onClick }: SkipButtonProps) {
  return (
    <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-50">
      <Button
        onClick={onClick}
        variant="ghost"
        className="text-[15px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
      >
        Skip
      </Button>
    </div>
  );
}
