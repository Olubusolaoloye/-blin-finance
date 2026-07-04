// Onboarding is outside the (app)/ route group.
// Root layout (PrivyProvider + QueryClientProvider) is all that's needed here.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
