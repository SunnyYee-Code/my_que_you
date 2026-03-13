import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-6 mb-6">
        <ShieldX className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-4xl font-bold font-display text-foreground mb-2">403</h1>
      <p className="text-lg text-muted-foreground mb-1">访问被拒绝</p>
      <p className="text-sm text-muted-foreground mb-8">您没有权限访问此页面，请联系管理员。</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>返回上一页</Button>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    </div>
  );
}
