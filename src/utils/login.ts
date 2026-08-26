export const handleEmail = (value: string, setEmail: (value: string) => void, setError: (value: string | null) => void, setDisabled: (value: boolean) => void) => {
  setEmail(value);
  setError(null);
  // Simple email regex check
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (isEmail) {
    setDisabled(false);
  } else {
    setDisabled(true);
  }
};