export const metadata = {
  title: "Life Tools",
  description: "便利ツールとお金の計算ツールのポータル",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
