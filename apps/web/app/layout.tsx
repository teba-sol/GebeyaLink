import type { Metadata } from 'next';
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  Plus_Jakarta_Sans,
} from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'GebeyaLink',
  description:
    'B2B agricultural commerce, supply-chain operations and marketplace platform.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${jakarta.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
