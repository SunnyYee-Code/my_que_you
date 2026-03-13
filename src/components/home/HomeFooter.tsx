import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function HomeFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="px-6 lg:px-20 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">雀</span>
              <span className="font-display text-lg font-bold">雀友聚</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              专注于提供透明、高效、有信用约束的同城麻将约局服务。基于LBS与社交信用体系，让每一次相聚都安心愉快。
            </p>
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">
                  法律声明：本平台仅供娱乐约局，<strong>禁止任何形式的赌博行为。</strong>违规者将被永久封号并移交公安机关处理。
                </p>
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-bold mb-4">平台</h3>
            <nav className="flex flex-col gap-2.5">
              <Link to="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">发现拼团</Link>
              <Link to="/group/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors">发起约局</Link>
              <Link to="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">信用申诉</Link>
            </nav>
          </div>

          {/* Terms */}
          <div>
            <h3 className="font-bold mb-4">条款</h3>
            <nav className="flex flex-col gap-2.5">
              <span className="text-sm text-muted-foreground">用户协议</span>
              <span className="text-sm text-muted-foreground">隐私政策</span>
              <span className="text-sm text-muted-foreground">防沉迷提示</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 lg:px-20 py-4">
        <p className="text-xs text-muted-foreground text-center">© 2026 雀友聚 · 仅供娱乐，禁止赌博</p>
      </div>
    </footer>
  );
}
