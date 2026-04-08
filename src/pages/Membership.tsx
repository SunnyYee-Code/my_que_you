import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MEMBER_TIERS, MEMBERSHIP_BENEFITS } from '@/lib/membership';
import { useAuth } from '@/contexts/AuthContext';
import { useMembershipStatus } from '@/hooks/useMembership';
import { Crown, Star, Zap, TrendingUp } from 'lucide-react';

export default function MembershipPage() {
  const { user } = useAuth();
  const { data: membership } = useMembershipStatus(user?.id);

  const benefitIcons: Record<string, React.ReactNode> = {
    avatar_frame: <Crown className="w-5 h-5" />,
    member_badge: <Star className="w-5 h-5" />,
    scorer_premium: <Zap className="w-5 h-5" />,
    priority_exposure: <TrendingUp className="w-5 h-5" />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 页头 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">会员权益中心</h1>
          <p className="text-xl text-gray-600">
            升级会员，解锁更多权益，提升您的约局体验
          </p>
        </div>

        {/* 当前会员状态 */}
        {membership && (
          <Card className="mb-12 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">您当前的会员状态</p>
                  <p className="text-2xl font-bold">
                    {membership.is_member
                      ? MEMBER_TIERS[membership.member_tier as any]?.name || '免费用户'
                      : '免费用户'}
                  </p>
                </div>
                {membership.is_member && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-lg px-4 py-2">
                    {MEMBER_TIERS[membership.member_tier as any]?.name}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 会员等级对比 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {Object.entries(MEMBER_TIERS).map(([tier, tierInfo]) => (
            <Card
              key={tier}
              className={`relative overflow-hidden transition-all ${
                tier === 'gold'
                  ? 'ring-2 ring-yellow-400 shadow-xl'
                  : tier === 'silver'
                    ? 'ring-1 ring-slate-200'
                    : ''
              }`}
            >
              {tier === 'gold' && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-white px-3 py-1 text-xs font-bold">
                  推荐
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl">{tierInfo.name}</CardTitle>
                  {tier === 'gold' && <Crown className="w-5 h-5 text-yellow-500" />}
                  {tier === 'silver' && <Star className="w-5 h-5 text-slate-400" />}
                </div>
                <CardDescription>{tierInfo.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 权益列表 */}
                <div className="space-y-3">
                  {tierInfo.benefits.length > 0 ? (
                    tierInfo.benefits.map(benefit => (
                      <div key={benefit.key} className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">
                          {benefitIcons[benefit.key] || benefit.icon}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{benefit.name}</p>
                          <p className="text-xs text-gray-600">{benefit.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">核心功能无限制使用</p>
                  )}
                </div>

                {/* 行动按钮 */}
                <div className="pt-4">
                  {tier === 'free' ? (
                    <p className="text-center text-sm text-gray-500">当前等级</p>
                  ) : (
                    <Button
                      className="w-full"
                      variant={tier === 'gold' ? 'default' : 'outline'}
                    >
                      升级到{tierInfo.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 权益详细说明 */}
        <div className="bg-white rounded-lg border p-8">
          <h2 className="text-2xl font-bold mb-8">权益详细说明</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {Object.entries(MEMBERSHIP_BENEFITS).map(([key, benefit]) => (
              <div key={key} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{benefit.icon}</span>
                  <h3 className="text-lg font-bold">{benefit.name}</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">{benefit.description}</p>
                <div className="flex gap-2">
                  {Object.entries(MEMBER_TIERS).map(([tier, tierInfo]) => {
                    const hasBenefit = tierInfo.benefits.some(b => b.key === key);
                    return (
                      <Badge
                        key={tier}
                        variant={hasBenefit ? 'default' : 'outline'}
                        className={hasBenefit ? 'bg-green-600' : ''}
                      >
                        {tierInfo.name}
                        {hasBenefit && ' ✓'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 免费用户提示 */}
        <Card className="mt-12 bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle>💡 会员说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>
              • 免费用户可完整使用找局、加入、聊天等核心功能，不受任何限制
            </p>
            <p>
              • 会员权益为可选增强功能，主要用于个人品牌展示和工具高级功能
            </p>
            <p>
              • 升级会员不影响原有使用体验，完全可选
            </p>
            <p>
              •
              V3阶段暂不开放购买，会员标记仅用于功能验证，敬请期待后续版本
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
