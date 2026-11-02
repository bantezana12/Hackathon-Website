import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'FastForge · Fan Favorite',
  description: 'Which team won you over? Pick your FastForge fan favorite and follow the live audience leaderboard.',
  icons: {icon:'/favicon.svg'},
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
