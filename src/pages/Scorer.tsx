import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface ScorerSession {
  id: string;
  players: Player[];
  initialScore: number;
  createdAt: number;
  groupId?: string;
}

const STORAGE_KEY = 'scorer_session';
const STORAGE_HISTORY_KEY = 'scorer_history';

export default function Scorer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'setup' | 'playing'>('setup');
  const [session, setSession] = useState<ScorerSession | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [initialScore, setInitialScore] = useState(0);
  const [playerNames, setPlayerNames] = useState<string[]>(['玩家1', '玩家2']);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [groupId, setGroupId] = useState<string>('');

  // 从URL查询参数恢复groupId
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('groupId');
    if (gid) {
      setGroupId(gid);
    }
    // 尝试恢复之前的会话
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedSession = JSON.parse(saved);
        setSession(parsedSession);
        setActiveTab('playing');
        // 初始化分数输入框
        const inputs: Record<string, string> = {};
        parsedSession.players.forEach((p: Player) => {
          inputs[p.id] = '0';
        });
        setScoreInputs(inputs);
      } catch (e) {
        console.error('Failed to restore session', e);
      }
    }
  }, []);

  // 开始记分
  const handleStartScoring = () => {
    if (playerCount < 2 || playerCount > 8) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '玩家数量需在2-8人之间',
      });
      return;
    }

    const players: Player[] = playerNames.slice(0, playerCount).map((name, i) => ({
      id: `player_${i}`,
      name: name || `玩家${i + 1}`,
      score: initialScore,
    }));

    const newSession: ScorerSession = {
      id: Date.now().toString(),
      players,
      initialScore,
      createdAt: Date.now(),
      groupId: groupId || undefined,
    };

    setSession(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    
    // 初始化分数输入框
    const inputs: Record<string, string> = {};
    players.forEach((p) => {
      inputs[p.id] = '0';
    });
    setScoreInputs(inputs);
    
    setActiveTab('playing');
    toast({
      title: '成功',
      description: `已创建${playerCount}人记分会话`,
    });
  };

  // 更新玩家分数
  const handleScoreChange = (playerId: string, value: string) => {
    setScoreInputs((prev) => ({
      ...prev,
      [playerId]: value,
    }));
  };

  // 应用本局得分
  const handleApplyScores = () => {
    if (!session) return;

    // 保存当前session到历史记录（用于撤销）
    const history = localStorage.getItem(STORAGE_HISTORY_KEY);
    let historyList = [];
    if (history) {
      try {
        historyList = JSON.parse(history);
      } catch (e) {
        historyList = [];
      }
    }
    historyList.push(JSON.parse(JSON.stringify(session)));
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(historyList));

    const updatedPlayers = session.players.map((p) => ({
      ...p,
      score: p.score + (parseInt(scoreInputs[p.id], 10) || 0),
    }));

    const updatedSession = { ...session, players: updatedPlayers };
    setSession(updatedSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));

    // 重置输入框
    const inputs: Record<string, string> = {};
    updatedPlayers.forEach((p) => {
      inputs[p.id] = '0';
    });
    setScoreInputs(inputs);

    toast({
      title: '成功',
      description: '本局得分已记录',
    });
  };

  // 撤销上一步
  const handleUndo = () => {
    if (!session || session.players.length === 0) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '没有可以撤销的操作',
      });
      return;
    }
    
    try {
      const history = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (!history) {
        toast({
          variant: 'destructive',
          title: '错误',
          description: '没有可以撤销的操作',
        });
        return;
      }

      const historyList = JSON.parse(history);
      if (historyList.length === 0) {
        toast({
          variant: 'destructive',
          title: '错误',
          description: '没有可以撤销的操作',
        });
        return;
      }

      const previousSession = historyList.pop();
      setSession(previousSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previousSession));
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(historyList));

      // 重置输入框
      const inputs: Record<string, string> = {};
      previousSession.players.forEach((p: Player) => {
        inputs[p.id] = '0';
      });
      setScoreInputs(inputs);

      toast({
        title: '成功',
        description: '已撤销上一步',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '撤销失败',
      });
    }
  };

  // 提交到战绩
  const handleSubmitToRanking = () => {
    if (!session) return;

    // 这里可以调用API提交到战绩
    // 暂时仅保存到localStorage
    const history = localStorage.getItem(STORAGE_HISTORY_KEY);
    let historyList = [];
    if (history) {
      try {
        historyList = JSON.parse(history);
      } catch (e) {
        historyList = [];
      }
    }
    
    // 保存最终结果
    const result = {
      ...session,
      submittedAt: Date.now(),
    };
    
    historyList.push(result);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(historyList));

    // 清空当前会话
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setActiveTab('setup');
    
    toast({
      title: '成功',
      description: '记分结果已提交到战绩',
    });
  };

  // 结束记分（不提交）
  const handleEndScoring = () => {
    if (!session) return;

    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setActiveTab('setup');
    
    toast({
      title: '成功',
      description: '记分会话已结束',
    });
  };

  // 新建会话（重置）
  const handleNewSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setActiveTab('setup');
    setPlayerCount(2);
    setInitialScore(0);
    setPlayerNames(['玩家1', '玩家2']);
    setScoreInputs({});
    setGroupId('');
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    const names = [...playerNames];
    names[index] = value;
    setPlayerNames(names);
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const newNames = [...playerNames];
    while (newNames.length < count) {
      newNames.push(`玩家${newNames.length + 1}`);
    }
    setPlayerNames(newNames);
  };

  const sortedPlayers = session ? [...session.players].sort((a, b) => b.score - a.score) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">记分器</h1>
          </div>
          {session && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewSession}
              className="text-sm"
            >
              新建会话
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'setup' | 'playing')}>
          {/* 标签页 */}
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="setup">设置</TabsTrigger>
            <TabsTrigger value="playing" disabled={!session}>
              记分
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">创建记分会话</h2>

              {/* 玩家数量选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  玩家数量：{playerCount}人
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                    <Button
                      key={count}
                      variant={playerCount === count ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePlayerCountChange(count)}
                    >
                      {count}人
                    </Button>
                  ))}
                </div>
              </div>

              {/* 玩家名称输入 */}
              <div className="mb-6 space-y-3">
                <label className="block text-sm font-medium text-gray-700">玩家名称</label>
                {playerNames.slice(0, playerCount).map((name, i) => (
                  <Input
                    key={i}
                    placeholder={`玩家${i + 1}`}
                    value={name}
                    onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                    className="text-base"
                  />
                ))}
              </div>

              {/* 初始分数 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  初始分数/筹码
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={initialScore}
                  onChange={(e) => setInitialScore(parseInt(e.target.value, 10) || 0)}
                  className="text-base"
                />
                <p className="text-xs text-gray-500 mt-2">每个玩家的起始分数</p>
              </div>

              {/* 关联局组（可选） */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关联局组ID（可选）
                </label>
                <Input
                  placeholder="例如：group_12345"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="text-base"
                />
                <p className="text-xs text-gray-500 mt-2">提交到战绩时会关联此局组</p>
              </div>

              {/* 开始按钮 */}
              <Button
                onClick={handleStartScoring}
                className="w-full py-6 text-lg font-semibold"
              >
                开始记分
              </Button>
            </Card>
          </TabsContent>

          {/* Playing Tab */}
          <TabsContent value="playing" className="space-y-4">
            {session && (
              <>
                {/* 积分排名 */}
                <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50">
                  <h2 className="text-lg font-semibold mb-4">当前积分排名</h2>
                  <div className="space-y-2">
                    {sortedPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{player.name}</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-indigo-600">{player.score}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 本局得分输入 */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">输入本局得分变化</h2>
                  <div className="space-y-3 mb-4">
                    {session.players.map((player) => (
                      <div key={player.id} className="flex items-center gap-3">
                        <label className="flex-1 text-sm font-medium text-gray-700">
                          {player.name}
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={scoreInputs[player.id] || '0'}
                          onChange={(e) => handleScoreChange(player.id, e.target.value)}
                          className="w-20 text-base"
                        />
                      </div>
                    ))}
                  </div>

                  {/* 应用按钮 */}
                  <Button
                    onClick={handleApplyScores}
                    className="w-full py-6 text-lg font-semibold mb-3"
                  >
                    记录本局得分
                  </Button>

                  {/* 撤销按钮 */}
                  <Button
                    variant="outline"
                    onClick={handleUndo}
                    className="w-full py-4"
                  >
                    撤销上一步
                  </Button>
                </Card>

                {/* 结束操作 */}
                <Card className="p-6 bg-gray-50">
                  <h2 className="text-lg font-semibold mb-4">结束会话</h2>
                  <div className="space-y-3">
                    <Button
                      onClick={handleSubmitToRanking}
                      className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700"
                    >
                      ✓ 提交到战绩
                    </Button>
                    <Button
                      onClick={handleEndScoring}
                      variant="outline"
                      className="w-full py-4"
                    >
                      结束会话（不提交）
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    提交到战绩后，结果将被保存并可查看
                  </p>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
