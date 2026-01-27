import { Button } from "@ui/components/Button"
interface SubmitButtonProps {
  loading: boolean
  text: string
  loadingText: string
}

export function SubmitButton({ loading, text, loadingText }: SubmitButtonProps) {
  return (
    <Button
      variant="primary"
      type="submit"
      disabled={loading}
    >
      {loading ? loadingText : text}
    </Button>
  )
}
