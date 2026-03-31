import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1920;

export type GroupSharePosterSource = {
  id: string;
  address: string;
  start_time: string;
  end_time: string;
  total_slots: number;
  needed_slots: number;
  play_style?: string | null;
  game_note?: string | null;
  hostNickname?: string | null;
};

export type GroupSharePosterModel = {
  title: string;
  summary: string;
  facts: string[];
  notes: string;
  shareLink: string;
  shareText: string;
  fileName: string;
  svgMarkup: string;
  svgDataUrl: string;
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildShareLink(groupId: string, origin: string) {
  const url = new URL(`/group/${groupId}`, origin);
  url.searchParams.set('from', 'poster');
  return url.toString();
}

function formatGroupTimeRange(startTime: string, endTime: string) {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  return `${format(startDate, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })} - ${format(endDate, 'HH:mm', { locale: zhCN })}`;
}

function buildVacancyText(totalSlots: number, neededSlots: number) {
  if (neededSlots <= 0) {
    return `${totalSlots}人局，已满员`;
  }

  return `${totalSlots}人局，还差${neededSlots}人`;
}

function wrapText(text: string, maxCharsPerLine: number, maxLines?: number) {
  if (text.length <= maxCharsPerLine) return [text];

  const lines: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const line = text.slice(startIndex, startIndex + maxCharsPerLine);
    lines.push(line);
    startIndex += maxCharsPerLine;

    if (maxLines && lines.length === maxLines && startIndex < text.length) {
      lines[maxLines - 1] = truncateText(lines[maxLines - 1], maxCharsPerLine);
      break;
    }
  }

  return lines;
}

function buildPosterSvg({
  title,
  summary,
  facts,
  notes,
  shareLink,
}: Omit<GroupSharePosterModel, 'shareText' | 'fileName' | 'svgMarkup' | 'svgDataUrl'>) {
  const titleLines = wrapText(title, 12, 2);
  const summaryLines = wrapText(summary, 16, 2);
  const noteLines = wrapText(`备注｜${notes}`, 18, 3);
  const linkLines = wrapText(shareLink, 26, 3);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" viewBox="0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}" fill="none">`,
    '<defs>',
    '<linearGradient id="bg" x1="0" y1="0" x2="1080" y2="1920" gradientUnits="userSpaceOnUse">',
    '<stop stop-color="#0F766E"/>',
    '<stop offset="0.58" stop-color="#134E4A"/>',
    '<stop offset="1" stop-color="#111827"/>',
    '</linearGradient>',
    '</defs>',
    '<rect width="1080" height="1920" fill="url(#bg)"/>',
    '<circle cx="904" cy="188" r="176" fill="#34D399" fill-opacity="0.16"/>',
    '<circle cx="202" cy="1620" r="220" fill="#FDE68A" fill-opacity="0.12"/>',
    '<rect x="72" y="72" width="936" height="1776" rx="48" fill="#F8FAFC" fill-opacity="0.96"/>',
    '<rect x="120" y="124" width="840" height="258" rx="36" fill="#0F766E"/>',
    '<text x="168" y="194" fill="#99F6E4" font-size="40" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">雀友聚 · 拼团邀约</text>',
    ...titleLines.map((line, index) => `<text x="168" y="${262 + index * 74}" fill="#FFFFFF" font-size="62" font-weight="700" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(line)}</text>`),
    ...summaryLines.map((line, index) => `<text x="168" y="${titleLines.length * 74 + 312 + index * 42}" fill="#CCFBF1" font-size="30" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(line)}</text>`),
    '<rect x="120" y="432" width="840" height="918" rx="36" fill="#FFFFFF"/>',
    ...facts.map((fact, index) => `
      <g transform="translate(156 ${500 + index * 150})">
        <rect width="768" height="112" rx="28" fill="${index % 2 === 0 ? '#F0FDFA' : '#F8FAFC'}"/>
        <text x="36" y="68" fill="#0F172A" font-size="34" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(fact)}</text>
      </g>
    `),
    '<rect x="156" y="1120" width="768" height="182" rx="28" fill="#FEF3C7"/>',
    ...noteLines.map((line, index) => `<text x="196" y="${1188 + index * 40}" fill="#92400E" font-size="32" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(line)}</text>`),
    '<rect x="120" y="1396" width="840" height="312" rx="36" fill="#0F172A"/>',
    '<text x="168" y="1468" fill="#F8FAFC" font-size="44" font-weight="700" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">打开雀友聚查看详情</text>',
    ...linkLines.map((line, index) => `<text x="168" y="${1546 + index * 36}" fill="#A7F3D0" font-size="24" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(line)}</text>`),
    '<text x="168" y="1670" fill="#94A3B8" font-size="24" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">可直接保存海报转发给牌友，也可通过系统分享拉起原生分享面板。</text>',
    '</svg>',
  ].join('');
}

export function buildGroupSharePosterModel(source: GroupSharePosterSource, origin = 'http://localhost') {
  const vacancyText = buildVacancyText(source.total_slots, source.needed_slots);
  const shareLink = buildShareLink(source.id, origin);
  const title = truncateText(`${source.hostNickname || '牌友'}邀你来局`, 24);
  const summary = truncateText(`${source.address} · ${source.play_style || '麻将组局'} · ${vacancyText}`, 48);
  const facts = [
    `时间｜${formatGroupTimeRange(source.start_time, source.end_time)}`,
    `地点｜${truncateText(source.address, 24)}`,
    `人数｜${vacancyText}`,
    `玩法｜${truncateText(source.play_style || '未设置', 16)}`,
  ];
  const notes = truncateText(
    source.game_note?.trim() || '欢迎准时守约、沟通顺畅的牌友一起组局',
    45,
  );
  const shareText = [
    title,
    summary,
    facts.join('\n'),
    `备注｜${notes}`,
    `详情链接｜${shareLink}`,
  ].join('\n');
  const fileName = `queyou-group-${source.id}-share-poster.png`;
  const svgMarkup = buildPosterSvg({
    title,
    summary,
    facts,
    notes,
    shareLink,
  });

  return {
    title,
    summary,
    facts,
    notes,
    shareLink,
    shareText,
    fileName,
    svgMarkup,
    svgDataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
  } satisfies GroupSharePosterModel;
}

function createPosterImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('海报图片加载失败'));
    image.decoding = 'async';
    image.src = src;
  });
}

async function renderPosterToCanvas(model: GroupSharePosterModel) {
  const image = await createPosterImage(model.svgDataUrl);
  await image.decode?.();

  const canvas = document.createElement('canvas');
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前环境不支持海报渲染');
  }

  context.drawImage(image, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('海报导出失败'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

export async function createGroupSharePosterBlob(model: GroupSharePosterModel) {
  const canvas = await renderPosterToCanvas(model);
  return canvasToBlob(canvas);
}

export async function createGroupSharePosterFile(model: GroupSharePosterModel) {
  const blob = await createGroupSharePosterBlob(model);

  if (typeof File === 'function') {
    return new File([blob], model.fileName, { type: blob.type || 'image/png' });
  }

  return blob;
}
