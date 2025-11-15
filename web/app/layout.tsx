// This is a minimal root layout that just passes through to locale-specific layouts
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
