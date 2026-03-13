// ========== Types ==========
export type City = {
  id: string;
  name: string;
};

export type UserRole = 'user' | 'admin';

export type MockUser = {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  creditScore: number;
  role: UserRole;
  cityId: string;
  createdAt: string;
};

export type GroupStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MockGroup = {
  id: string;
  hostId: string;
  cityId: string;
  status: GroupStatus;
  startTime: string;
  endTime: string;
  address: string;
  lat: number;
  lng: number;
  totalSlots: number;
  neededSlots: number;
  memberIds: string[];
  gameNote: string;
  playStyle: string;
  createdAt: string;
};

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type MockApplication = {
  id: string;
  groupId: string;
  userId: string;
  status: ApplicationStatus;
  createdAt: string;
};

export type MockReview = {
  id: string;
  groupId: string;
  reviewerId: string;
  targetId: string;
  punctuality: number;
  attitude: number;
  skill: number;
  comment: string;
  createdAt: string;
};

export type MockMessage = {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  type: 'text' | 'voice' | 'location';
  createdAt: string;
};

export type NotificationType = 'application_update' | 'group_cancelled' | 'credit_change' | 'review_received';

export type MockNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  linkTo: string;
  createdAt: string;
};

export type CreditHistory = {
  id: string;
  userId: string;
  change: number;
  reason: string;
  canAppeal: boolean;
  createdAt: string;
};

// ========== Data ==========

export const cities: City[] = [
  { id: 'chengdu', name: '成都' },
  { id: 'chongqing', name: '重庆' },
  { id: 'beijing', name: '北京' },
];

export const mockUsers: MockUser[] = [
  { id: 'u1', nickname: '麻将大师', avatar: '', phone: '13800000001', creditScore: 95, role: 'user', cityId: 'chengdu', createdAt: '2025-01-15' },
  { id: 'u2', nickname: '快乐牌手', avatar: '', phone: '13800000002', creditScore: 88, role: 'user', cityId: 'chengdu', createdAt: '2025-02-01' },
  { id: 'u3', nickname: '雀神小王', avatar: '', phone: '13800000003', creditScore: 72, role: 'user', cityId: 'chengdu', createdAt: '2025-01-20' },
  { id: 'u4', nickname: '巴蜀牌王', avatar: '', phone: '13800000004', creditScore: 55, role: 'user', cityId: 'chongqing', createdAt: '2025-03-01' },
  { id: 'u5', nickname: '火锅麻友', avatar: '', phone: '13800000005', creditScore: 90, role: 'user', cityId: 'chongqing', createdAt: '2025-01-10' },
  { id: 'u6', nickname: '京城雀客', avatar: '', phone: '13800000006', creditScore: 82, role: 'user', cityId: 'beijing', createdAt: '2025-02-15' },
  { id: 'u7', nickname: '胡同牌友', avatar: '', phone: '13800000007', creditScore: 65, role: 'user', cityId: 'beijing', createdAt: '2025-03-05' },
  { id: 'u8', nickname: '南城小雀', avatar: '', phone: '13800000008', creditScore: 91, role: 'user', cityId: 'beijing', createdAt: '2025-01-25' },
  { id: 'u9', nickname: '管理员老张', avatar: '', phone: '13800000009', creditScore: 100, role: 'admin', cityId: 'chengdu', createdAt: '2025-01-01' },
  { id: 'u10', nickname: '休闲玩家', avatar: '', phone: '13800000010', creditScore: 78, role: 'user', cityId: 'chongqing', createdAt: '2025-02-20' },
];

const futureDate = (hoursFromNow: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
};

const pastDate = (hoursAgo: number) => {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
};

export const mockGroups: MockGroup[] = [
  // Chengdu groups
  { id: 'g1', hostId: 'u1', cityId: 'chengdu', status: 'OPEN', startTime: futureDate(3), endTime: futureDate(7), address: '成都市锦江区春熙路88号茶馆3楼', lat: 30.657, lng: 104.066, totalSlots: 4, neededSlots: 2, memberIds: ['u1', 'u2'], gameNote: '血战到底，来三缺一！气氛轻松', playStyle: '血战到底', createdAt: pastDate(2) },
  { id: 'g2', hostId: 'u2', cityId: 'chengdu', status: 'OPEN', startTime: futureDate(5), endTime: futureDate(9), address: '成都市武侯区科华北路56号棋牌室', lat: 30.634, lng: 104.075, totalSlots: 4, neededSlots: 1, memberIds: ['u2', 'u1', 'u3'], gameNote: '老手局，节奏快', playStyle: '血流成河', createdAt: pastDate(1) },
  { id: 'g3', hostId: 'u3', cityId: 'chengdu', status: 'FULL', startTime: futureDate(1), endTime: futureDate(5), address: '成都市青羊区宽窄巷子旁', lat: 30.669, lng: 104.052, totalSlots: 4, neededSlots: 0, memberIds: ['u3', 'u1', 'u2', 'u10'], gameNote: '休闲局，新手友好', playStyle: '血战到底', createdAt: pastDate(5) },
  { id: 'g4', hostId: 'u1', cityId: 'chengdu', status: 'COMPLETED', startTime: pastDate(48), endTime: pastDate(44), address: '成都市高新区天府三街', lat: 30.546, lng: 104.063, totalSlots: 4, neededSlots: 0, memberIds: ['u1', 'u2', 'u3', 'u10'], gameNote: '已结束', playStyle: '血战到底', createdAt: pastDate(72) },
  { id: 'g5', hostId: 'u2', cityId: 'chengdu', status: 'CANCELLED', startTime: pastDate(24), endTime: pastDate(20), address: '成都市金牛区交大路', lat: 30.693, lng: 104.047, totalSlots: 3, neededSlots: 1, memberIds: ['u2', 'u3'], gameNote: '因故取消', playStyle: '血战到底', createdAt: pastDate(48) },
  // Chongqing groups
  { id: 'g6', hostId: 'u4', cityId: 'chongqing', status: 'OPEN', startTime: futureDate(2), endTime: futureDate(6), address: '重庆市渝中区解放碑步行街旁棋牌室', lat: 29.558, lng: 106.577, totalSlots: 4, neededSlots: 3, memberIds: ['u4'], gameNote: '三缺三！快来组局', playStyle: '重庆麻将', createdAt: pastDate(1) },
  { id: 'g7', hostId: 'u5', cityId: 'chongqing', status: 'OPEN', startTime: futureDate(8), endTime: futureDate(12), address: '重庆市南岸区南滨路火锅街2楼', lat: 29.537, lng: 106.588, totalSlots: 4, neededSlots: 2, memberIds: ['u5', 'u10'], gameNote: '边吃火锅边打牌', playStyle: '血流成河', createdAt: pastDate(3) },
  { id: 'g8', hostId: 'u10', cityId: 'chongqing', status: 'FULL', startTime: futureDate(1), endTime: futureDate(4), address: '重庆市江北区观音桥', lat: 29.575, lng: 106.574, totalSlots: 3, neededSlots: 0, memberIds: ['u10', 'u4', 'u5'], gameNote: '三人局', playStyle: '重庆麻将', createdAt: pastDate(6) },
  { id: 'g9', hostId: 'u5', cityId: 'chongqing', status: 'COMPLETED', startTime: pastDate(30), endTime: pastDate(26), address: '重庆市沙坪坝区三峡广场', lat: 29.572, lng: 106.454, totalSlots: 4, neededSlots: 0, memberIds: ['u5', 'u4', 'u10', 'u1'], gameNote: '完美一局', playStyle: '血战到底', createdAt: pastDate(50) },
  // Beijing groups
  { id: 'g10', hostId: 'u6', cityId: 'beijing', status: 'OPEN', startTime: futureDate(4), endTime: futureDate(8), address: '北京市东城区王府井大街棋牌会所', lat: 39.914, lng: 116.410, totalSlots: 4, neededSlots: 2, memberIds: ['u6', 'u8'], gameNote: '北京麻将，规矩打', playStyle: '北京麻将', createdAt: pastDate(2) },
  { id: 'g11', hostId: 'u7', cityId: 'beijing', status: 'OPEN', startTime: futureDate(6), endTime: futureDate(10), address: '北京市西城区什刹海附近茶楼', lat: 39.937, lng: 116.384, totalSlots: 4, neededSlots: 1, memberIds: ['u7', 'u6', 'u8'], gameNote: '老北京茶馆麻将', playStyle: '国标麻将', createdAt: pastDate(4) },
  { id: 'g12', hostId: 'u8', cityId: 'beijing', status: 'COMPLETED', startTime: pastDate(20), endTime: pastDate(16), address: '北京市朝阳区三里屯', lat: 39.934, lng: 116.454, totalSlots: 4, neededSlots: 0, memberIds: ['u8', 'u6', 'u7', 'u1'], gameNote: '已完成', playStyle: '北京麻将', createdAt: pastDate(40) },
];

export const mockApplications: MockApplication[] = [
  { id: 'a1', groupId: 'g1', userId: 'u3', status: 'PENDING', createdAt: pastDate(1) },
  { id: 'a2', groupId: 'g1', userId: 'u10', status: 'PENDING', createdAt: pastDate(0.5) },
  { id: 'a3', groupId: 'g6', userId: 'u5', status: 'APPROVED', createdAt: pastDate(2) },
  { id: 'a4', groupId: 'g10', userId: 'u7', status: 'REJECTED', createdAt: pastDate(3) },
  { id: 'a5', groupId: 'g7', userId: 'u4', status: 'PENDING', createdAt: pastDate(1) },
];

export const mockReviews: MockReview[] = [
  { id: 'r1', groupId: 'g4', reviewerId: 'u2', targetId: 'u1', punctuality: 5, attitude: 5, skill: 4, comment: '大师名不虚传！', createdAt: pastDate(44) },
  { id: 'r2', groupId: 'g4', reviewerId: 'u3', targetId: 'u1', punctuality: 4, attitude: 5, skill: 5, comment: '牌技很好', createdAt: pastDate(43) },
  { id: 'r3', groupId: 'g4', reviewerId: 'u1', targetId: 'u2', punctuality: 5, attitude: 4, skill: 4, comment: '配合默契', createdAt: pastDate(44) },
  { id: 'r4', groupId: 'g9', reviewerId: 'u4', targetId: 'u5', punctuality: 3, attitude: 5, skill: 4, comment: '迟到了一会，但人很好', createdAt: pastDate(25) },
  { id: 'r5', groupId: 'g12', reviewerId: 'u6', targetId: 'u8', punctuality: 5, attitude: 5, skill: 5, comment: '完美牌友', createdAt: pastDate(15) },
];

export const mockMessages: MockMessage[] = [
  { id: 'm1', groupId: 'g1', senderId: 'u1', content: '大家好，今晚春熙路见！', type: 'text', createdAt: pastDate(1) },
  { id: 'm2', groupId: 'g1', senderId: 'u2', content: '收到，我准时到', type: 'text', createdAt: pastDate(0.9) },
  { id: 'm3', groupId: 'g1', senderId: 'u1', content: '茶水我来准备', type: 'text', createdAt: pastDate(0.8) },
  { id: 'm4', groupId: 'g1', senderId: 'u2', content: '太好了！期待', type: 'text', createdAt: pastDate(0.7) },
  { id: 'm5', groupId: 'g6', senderId: 'u4', content: '解放碑这家环境不错', type: 'text', createdAt: pastDate(0.5) },
  { id: 'm6', groupId: 'g10', senderId: 'u6', content: '王府井那家新开的，设施很新', type: 'text', createdAt: pastDate(2) },
  { id: 'm7', groupId: 'g10', senderId: 'u8', content: '好的，到时候见', type: 'text', createdAt: pastDate(1.8) },
];

export const mockNotifications: MockNotification[] = [
  { id: 'n1', userId: 'u1', type: 'application_update', title: '新的加入申请', content: '雀神小王 申请加入您的拼团', read: false, linkTo: '/host/requests', createdAt: pastDate(1) },
  { id: 'n2', userId: 'u1', type: 'application_update', title: '新的加入申请', content: '休闲玩家 申请加入您的拼团', read: false, linkTo: '/host/requests', createdAt: pastDate(0.5) },
  { id: 'n3', userId: 'u3', type: 'application_update', title: '申请状态更新', content: '您的拼团申请正在审核中', read: true, linkTo: '/group/g1', createdAt: pastDate(1) },
  { id: 'n4', userId: 'u5', type: 'group_cancelled', title: '拼团已取消', content: '您参加的拼团已被房主取消', read: false, linkTo: '/group/g5', createdAt: pastDate(24) },
  { id: 'n5', userId: 'u4', type: 'credit_change', title: '信用分变动', content: '因迟到，信用分 -5', read: true, linkTo: '/settings', createdAt: pastDate(30) },
  { id: 'n6', userId: 'u1', type: 'review_received', title: '收到新评价', content: '快乐牌手 对您进行了评价', read: false, linkTo: '/profile/u1', createdAt: pastDate(44) },
];

export const mockCreditHistory: CreditHistory[] = [
  { id: 'ch1', userId: 'u1', change: 5, reason: '完成拼团 +5', canAppeal: false, createdAt: pastDate(44) },
  { id: 'ch2', userId: 'u1', change: -3, reason: '迟到15分钟 -3', canAppeal: true, createdAt: pastDate(100) },
  { id: 'ch3', userId: 'u4', change: -5, reason: '迟到30分钟 -5', canAppeal: true, createdAt: pastDate(30) },
  { id: 'ch4', userId: 'u4', change: -10, reason: '未到场 -10', canAppeal: false, createdAt: pastDate(80) },
  { id: 'ch5', userId: 'u3', change: 5, reason: '完成拼团 +5', canAppeal: false, createdAt: pastDate(50) },
  { id: 'ch6', userId: 'u3', change: -8, reason: '30分钟内退出 -8', canAppeal: true, createdAt: pastDate(20) },
];

// ========== Helper functions ==========

export const getUserById = (id: string) => mockUsers.find(u => u.id === id);
export const getGroupById = (id: string) => mockGroups.find(g => g.id === id);
export const getGroupsByCity = (cityId: string) => mockGroups.filter(g => g.cityId === cityId);
export const getGroupsByHost = (hostId: string) => mockGroups.filter(g => g.hostId === hostId);
export const getGroupsByMember = (userId: string) => mockGroups.filter(g => g.memberIds.includes(userId));
export const getApplicationsByGroup = (groupId: string) => mockApplications.filter(a => a.groupId === groupId);
export const getApplicationsByUser = (userId: string) => mockApplications.filter(a => a.userId === userId);
export const getReviewsByTarget = (targetId: string) => mockReviews.filter(r => r.targetId === targetId);
export const getReviewsByGroup = (groupId: string) => mockReviews.filter(r => r.groupId === groupId);
export const getMessagesByGroup = (groupId: string) => mockMessages.filter(m => m.groupId === groupId);
export const getNotificationsByUser = (userId: string) => mockNotifications.filter(n => n.userId === userId);
export const getCreditHistoryByUser = (userId: string) => mockCreditHistory.filter(ch => ch.userId === userId);

// Current logged-in user (mock)
export const CURRENT_USER_ID = 'u1';
export const getCurrentUser = () => getUserById(CURRENT_USER_ID)!;
