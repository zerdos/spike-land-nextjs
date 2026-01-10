
import { InboxItem as InboxItemType } from '@prisma/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface InboxItemProps {
  item: InboxItemType;
  isSelected: boolean;
  onClick: () => void;
}

function getPlatformIcon(platform: string) {
  // In a real app, you'd have icons for each platform
  return platform.substring(0, 1).toUpperCase();
}

export function InboxItem({ item, isSelected, onClick }: InboxItemProps) {
  return (
    <Card
      className={`cursor-pointer ${isSelected ? 'bg-gray-100' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-start space-x-4">
        <Avatar>
          <AvatarImage src={item.senderAvatarUrl ?? undefined} alt={item.senderName} />
          <AvatarFallback>{getPlatformIcon(item.platform)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{item.senderName}</div>
            <div className="text-xs text-gray-500">{new Date(item.receivedAt).toLocaleDateString()}</div>
          </div>
          <div className="text-sm text-gray-700 mt-1">{item.content}</div>
          <div className="mt-2">
            <Badge variant="outline">{item.type}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
