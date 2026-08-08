import { Globe, Key, Mail, Code, MessageCircle, Users, MessageSquare, Layout, Hash } from "lucide-react";

export function resolveIcon(url: string | null | undefined): React.ElementType {
  if (!url) return Key;

  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
    
    if (domain.includes("github.com")) return Code;
    if (domain.includes("google.com") || domain.includes("gmail.com")) return Mail;
    if (domain.includes("twitter.com") || domain.includes("x.com")) return MessageCircle;
    if (domain.includes("linkedin.com")) return Users;
    if (domain.includes("facebook.com")) return Users;
    if (domain.includes("discord.com")) return MessageSquare;
    if (domain.includes("figma.com")) return Layout;
    if (domain.includes("slack.com")) return Hash;

    return Globe;
  } catch {
    return Key;
  }
}
