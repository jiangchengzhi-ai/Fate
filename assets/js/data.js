/* ==========================================================================
   data.js — 相法知识库
   一切判断都在本机完成：选项 → 维度增减 → 批注文字。
   文字取半文半白，只作参照，不作断语。
   ========================================================================== */

export const DIMS = {
  career: '事业',
  wealth: '财帛',
  love: '姻缘',
  health: '康宁',
  social: '人和',
  mind: '心性',
};

export const DIM_KEYS = Object.keys(DIMS);

/* --------------------------------------------------------------------------
   面相
   -------------------------------------------------------------------------- */
export const FACE = {
  key: 'face',
  name: '面相',
  glyph: '相',
  title: '观面',
  lead: '相学看三停五官：上停看早年与思路，中停看中年与财官，下停看晚运与根基。上传正面照即可直接看相，也可以自己逐项选。',
  photoHint: '照片默认只在本机；点「看相」时才发给一次视觉模型。',
  questions: [
    {
      id: 'shape',
      num: '一',
      title: '脸型',
      hint: '看整张脸最宽的落点，以及轮廓是收还是放。',
      options: [
        {
          v: 'wood', label: '长圆／鹅蛋', note: '线条舒展，骨不外露',
          dims: { career: 1, wealth: 0, love: 1, health: 0, social: 0, mind: 2 },
          traits: ['善思', '有耐性'], elem: '木',
          text: '面长而秀，木气为主。主思虑细、续航久，遇事习惯先想清楚再动手；短处是想法多，落地慢半拍。',
        },
        {
          v: 'earth', label: '方正／国字', note: '骨架宽，腮部有力',
          dims: { career: 2, wealth: 1, love: -1, health: 2, social: 0, mind: 0 },
          traits: ['能扛事', '守诺'], elem: '土',
          text: '骨相方正，土气厚。重承诺、扛得住压力，节奏稳，不喜欢计划被打断；感情上不擅长说软话。',
        },
        {
          v: 'water', label: '圆润饱满', note: '颊部丰，线条圆',
          dims: { career: 0, wealth: 1, love: 1, health: 0, social: 3, mind: 0 },
          traits: ['圆融', '人缘好'], elem: '水',
          text: '面圆而润，水气足。人情练达，走到哪里都有人愿意搭手；要留意被人情牵着走，久了会替别人活。',
        },
        {
          v: 'fire', label: '上宽下收／尖', note: '额宽颏尖，轮廓锐',
          dims: { career: 0, wealth: -1, love: 1, health: -1, social: 1, mind: 2 },
          traits: ['敏锐', '起势快'], elem: '火',
          text: '上宽下收，火气明。感知快、表达快，起势猛；收尾要靠制度和伙伴，否则容易开很多头。',
        },
        {
          v: 'metal', label: '方圆带棱', note: '颧颌分明，骨相清',
          dims: { career: 3, wealth: 1, love: -1, health: 1, social: -1, mind: 1 },
          traits: ['果断', '标准高'], elem: '金',
          text: '轮廓分明带棱，金气刚。判断利落，做事有标准；对人对己都偏严，容易把关系处成考核。',
        },
      ],
    },
    {
      id: 'forehead',
      num: '二',
      title: '额头 · 上停',
      hint: '发际到眉心的这一段，主早年、长辈缘与思考方式。',
      options: [
        {
          v: 'broad', label: '高阔饱满', note: '发际高，额面圆润',
          dims: { career: 2, wealth: 0, love: 0, health: 1, social: 1, mind: 2 },
          stop: 78, traits: ['有主见', '得长辈缘'],
          text: '上停开阔，早年多得师长与长辈提携，适合在体系里做需要长期积累的事；也容易把“想明白”当成“做到”。',
        },
        {
          v: 'even', label: '中等平顺', note: '不高不窄，发际整齐',
          dims: { career: 0, wealth: 1, love: 1, health: 1, social: 0, mind: 1 },
          stop: 64, traits: ['稳', '不张扬'],
          text: '上停平顺，起运不早不晚。靠手艺与口碑一步步立住，不走捷径，也少走弯路。',
        },
        {
          v: 'narrow', label: '偏窄／发际压眉', note: '额面短，眉近发际',
          dims: { career: -1, wealth: 0, love: 0, health: 0, social: -1, mind: 1 },
          stop: 50, traits: ['自立', '早熟'],
          text: '上停偏窄，早年多半靠自己摸索，长辈能给的有限。宜早学一门硬本事，不必急着求名，三十岁后反而稳。',
        },
        {
          v: 'lines', label: '有横纹早现', note: '额上纹路深而早',
          dims: { career: 1, wealth: 0, love: 0, health: -1, social: 0, mind: 1 },
          stop: 60, traits: ['操心', '想得远'],
          text: '额上纹路早现，思虑重、操心多。把心里那本账写在纸上，能省掉一半内耗。',
        },
        {
          v: 'peak', label: '美人尖／发际不齐', note: '额角不规则，发际成尖',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 1, mind: -1 },
          stop: 58, traits: ['不服管', '有主张'],
          text: '发际成尖，性子里有不服管的一面。适合有自主空间的位置，被按在格子里反而做不好。',
        },
      ],
    },
    {
      id: 'brow',
      num: '三',
      title: '眉毛 · 兄弟宫',
      hint: '看浓淡、走势与眉尾是否聚。主情绪、同辈与决断。',
      options: [
        {
          v: 'thick', label: '浓密上扬', note: '眉浓，眉尾上挑',
          dims: { career: 2, wealth: 0, love: 0, health: 0, social: 1, mind: -1 },
          traits: ['气盛', '肯担责'],
          text: '眉浓而上扬，气盛。做事愿担责，也容易一时上头；冲突当下先停三秒，多半能少一场后悔。',
        },
        {
          v: 'fine', label: '细长平直', note: '眉形匀，走势平',
          dims: { career: 0, wealth: 1, love: 1, health: 0, social: 2, mind: 1 },
          traits: ['温和', '有分寸'],
          text: '眉细而平，性情温和有分寸。擅长协调，是团队里的黏合剂；决断时容易顾左右，需要有人催一下。',
        },
        {
          v: 'sparse', label: '稀疏／眉尾淡', note: '眉色淡，眉尾散',
          dims: { career: 0, wealth: 0, love: -1, health: -1, social: -2, mind: 1 },
          traits: ['独立', '交友谨慎'],
          text: '眉稀，同辈与亲缘的助力偏薄，多靠自己。交友宜精不宜多，三位能托底的人胜过三十个熟人。',
        },
        {
          v: 'willow', label: '柳叶弯眉', note: '眉弯，眉峰柔和',
          dims: { career: 0, wealth: 0, love: 2, health: 0, social: 2, mind: 0 },
          traits: ['细腻', '审美好'],
          text: '眉弯如柳，感受细腻，审美好。适合与内容、审美、服务相关的方向；也容易把别人的情绪接过来背。',
        },
        {
          v: 'straight', label: '一字眉', note: '眉平如线，眉峰弱',
          dims: { career: 1, wealth: 0, love: 0, health: 0, social: -1, mind: 2 },
          traits: ['认原则', '直'],
          text: '眉平如一字，直来直去。认死理也认原则，合作时把规则说在前面，反而处得长久。',
        },
        {
          v: 'broken', label: '眉中斷／眉尾散', note: '眉有缺口或尾部分叉',
          dims: { career: -1, wealth: 0, love: -1, health: -1, social: -1, mind: 0 },
          traits: ['多转折', '需缓冲'],
          text: '眉有断处，计划易被外力打断。重要事项留出缓冲，不要把日程排满，留白就是余地。',
        },
      ],
    },
    {
      id: 'eye',
      num: '四',
      title: '眼睛 · 神',
      hint: '相书说“十分面相，七分看眼”。看形状，也看是否有神。',
      options: [
        {
          v: 'big', label: '大而有神', note: '眼大，目光清亮',
          dims: { career: 1, wealth: 0, love: 2, health: 0, social: 3, mind: 0 },
          traits: ['外放', '易被看见'],
          text: '眼大而藏神，外放、容易被看见。机会多也杂，学会筛选比一味努力更重要。',
        },
        {
          v: 'phoenix', label: '细长凤眼', note: '眼形细长，眼尾微挑',
          dims: { career: 2, wealth: 1, love: 1, health: 0, social: 0, mind: 3 },
          traits: ['看人准', '沉得住'],
          text: '眼细长，收得住神。看人准、耐性好，适合做需要判断与长期主义的事；不轻易表态，容易被误读为冷淡。',
        },
        {
          v: 'round', label: '圆眼', note: '眼圆而亮，黑白分明',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 2, mind: -1 },
          traits: ['直率', '不记仇'],
          text: '眼圆，心思直，情绪来得快去得也快。好在不记仇，坏在话出口比脑子快。',
        },
        {
          v: 'droop', label: '眼尾下垂', note: '外眼角略低',
          dims: { career: -1, wealth: 0, love: 2, health: 0, social: 1, mind: 0 },
          traits: ['心软', '念旧'],
          text: '眼尾略垂，心软、念旧。总替别人多想一步，边界要自己划，不然付出会变成理所当然。',
        },
        {
          v: 'sanbai', label: '三白眼', note: '眼白偏多，瞳位偏高或偏低',
          dims: { career: 2, wealth: 0, love: -1, health: 0, social: -2, mind: 2 },
          traits: ['主见强', '抗压'],
          text: '眼白偏多，主见强、抗压，锋芒也露。位置越高越要收，收敛不是示弱，是省力。',
        },
        {
          v: 'uplift', label: '眼尾上扬', note: '外眼角上挑，笑眼',
          dims: { career: 2, wealth: 1, love: 1, health: 0, social: 2, mind: 0 },
          traits: ['好胜', '有表现欲'],
          text: '眼尾上挑，好胜、有表现欲，适合台前。只是别把每件事都当成输赢，有些局不参与才是赢。',
        },
      ],
    },
    {
      id: 'nose',
      num: '五',
      title: '鼻子 · 财帛宫',
      hint: '看鼻梁的挺度、鼻头的肉感与鼻翼的收放。主中年与财。',
      options: [
        {
          v: 'high', label: '鼻梁高挺', note: '山根到鼻头一线直',
          dims: { career: 3, wealth: 1, love: 0, health: 1, social: 0, mind: 1 },
          traits: ['执行力强', '自立'],
          text: '鼻梁挺，主见与执行力都在线。中年运势靠自己撑起来，不太依赖运气，也不太听得进劝。',
        },
        {
          v: 'fleshy', label: '鼻头有肉', note: '鼻头圆厚，鼻翼收',
          dims: { career: 0, wealth: 3, love: 1, health: 1, social: 0, mind: 0 },
          traits: ['聚财', '厚道'],
          text: '鼻头圆厚，聚财力强，钱留得住。理财偏保守是优点，不必因为别人赚快钱而改自己的节奏。',
        },
        {
          v: 'flat', label: '鼻梁低平', note: '山根低，鼻面平',
          dims: { career: -1, wealth: -1, love: 1, health: 0, social: 2, mind: 0 },
          traits: ['随和', '不争'],
          text: '鼻梁平，性子随和，不争第一。合作型的路比单打独斗顺，遇强则强，遇懒则容易一起懒。',
        },
        {
          v: 'flare', label: '鼻翼外张', note: '鼻翼宽，孔露',
          dims: { career: 0, wealth: 2, love: 0, health: 0, social: 1, mind: -1 },
          traits: ['进财快', '手松'],
          text: '鼻翼张，进财快也花得快。设一道自动储蓄的闸，比事后记账有用得多。',
        },
        {
          v: 'hook', label: '鹰钩／鼻尖下勾', note: '鼻尖下垂，鼻梁起节',
          dims: { career: 1, wealth: 2, love: -1, health: 0, social: -2, mind: 2 },
          traits: ['算得精', '守得住'],
          text: '鼻尖下勾，算得精、守得住，不容易吃亏；也容易显得计较，适当让利是在换长期。',
        },
        {
          v: 'small', label: '鼻头尖小', note: '鼻体小，鼻头尖',
          dims: { career: 1, wealth: -2, love: 0, health: -1, social: 0, mind: 2 },
          traits: ['靠脑力', '求稳'],
          text: '鼻头尖小，求财多靠专业与脑力，不宜重仓押注。把一门手艺磨到稀缺，比追风口可靠。',
        },
      ],
    },
    {
      id: 'cheek',
      num: '六',
      title: '颧颊 · 权势与人缘',
      hint: '看颧骨的高低、面颊的丰瘦与左右是否对称。',
      options: [
        {
          v: 'high', label: '颧骨高而有肉', note: '颧起，包得住肉',
          dims: { career: 3, wealth: 1, love: 0, health: 1, social: 0, mind: 1 },
          traits: ['能带队', '掌控欲'],
          text: '颧高有肉，掌控欲与担当并存，适合带团队。权力要用在解决问题上，用在证明自己上就会结怨。',
        },
        {
          v: 'even', label: '颧平满', note: '颧不明显，面平顺',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 2, mind: 0 },
          traits: ['不争位', '稳'],
          text: '颧平，不爱争位，人缘稳。适合做黏合与支撑的角色，功劳容易被拿走，记得把成果留下书面痕迹。',
        },
        {
          v: 'full', label: '面颊丰润', note: '颊肉厚，气色润',
          dims: { career: 0, wealth: 1, love: 1, health: 2, social: 1, mind: 0 },
          traits: ['有福相', '会生活'],
          text: '颊丰，福气厚，善于享受生活。注意别把舒适当成目标，福气也要有事情撑着才稳。',
        },
        {
          v: 'thin', label: '面颊偏瘦', note: '颊瘦，骨感明显',
          dims: { career: 1, wealth: 0, love: 0, health: -2, social: 0, mind: 2 },
          traits: ['思虑多', '消耗大'],
          text: '颊瘦，思虑多、消耗大。规律吃饭睡觉比任何补品都管用，身体的账最不能欠。',
        },
        {
          v: 'uneven', label: '左右不对称', note: '两颊或眉眼高低不一',
          dims: { career: 0, wealth: 0, love: -1, health: -1, social: 0, mind: -1 },
          traits: ['内在拉扯', '两面性'],
          text: '左右略有差异，情绪与判断有时不同步。重大决定写在纸上放一夜再看，能避开大半冲动。',
        },
      ],
    },
    {
      id: 'mouth',
      num: '七',
      title: '口唇 · 出纳',
      hint: '看唇的厚薄与嘴角的走向。主表达、亲密关系与食禄。',
      options: [
        {
          v: 'thick', label: '唇厚', note: '上下唇都厚而润',
          dims: { career: 0, wealth: 0, love: 2, health: 1, social: 2, mind: 0 },
          traits: ['重情', '口福好'],
          text: '唇厚，重情、口福好。承诺给得大方，记得量力；给不出的承诺，早说比晚说体面。',
        },
        {
          v: 'thin', label: '唇薄', note: '唇线薄而清晰',
          dims: { career: 1, wealth: 0, love: -1, health: 0, social: 0, mind: 2 },
          traits: ['表达利落', '讲理'],
          text: '唇薄，表达利落，讲理胜过讲情。亲密关系里多给一点温度，道理赢了、人心散了是常事。',
        },
        {
          v: 'up', label: '嘴角上扬', note: '静时也带笑意',
          dims: { career: 1, wealth: 0, love: 2, health: 1, social: 3, mind: 0 },
          traits: ['亲和', '易被低估'],
          text: '嘴角上扬，天生带笑，容易被喜欢，也容易被低估。关键时刻要亮出立场，笑不代表好商量。',
        },
        {
          v: 'down', label: '嘴角下垂', note: '静时嘴角向下',
          dims: { career: 0, wealth: 0, love: -2, health: -1, social: -1, mind: 1 },
          traits: ['先想最坏', '谨慎'],
          text: '嘴角略垂，思考偏悲观。先把最坏情况写下来，往往没那么坏；写完再决定要不要担心。',
        },
        {
          v: 'wide', label: '嘴大', note: '口宽过鼻翼',
          dims: { career: 2, wealth: 1, love: 0, health: 0, social: 2, mind: -1 },
          traits: ['气魄足', '敢开口'],
          text: '口大，气魄足，敢开口要资源。注意话别说满，留一分余地，日后好相见。',
        },
        {
          v: 'narrow', label: '嘴小', note: '口形小而收',
          dims: { career: 0, wealth: 1, love: 0, health: 0, social: -1, mind: 1 },
          traits: ['守口', '谨慎'],
          text: '口小，谨慎、守口，适合做需要保密与细节的事。表达上可以再主动一点，好东西也要说出去才算数。',
        },
      ],
    },
    {
      id: 'chin',
      num: '八',
      title: '下巴 · 下停',
      hint: '主晚运、根基与承受力，也看一个人能不能享福。',
      options: [
        {
          v: 'round', label: '圆润有力', note: '下颏圆厚，颈颌相连',
          dims: { career: 0, wealth: 2, love: 1, health: 2, social: 1, mind: 0 },
          stop: 76, traits: ['晚运稳', '能享福'],
          text: '下停圆厚，晚运稳，越往后越能享到前面种下的果。年轻时的积累不会白费。',
        },
        {
          v: 'pointed', label: '尖削', note: '下颏收成尖',
          dims: { career: 0, wealth: -1, love: 1, health: -1, social: 0, mind: 1 },
          stop: 46, traits: ['理想主义', '清瘦'],
          text: '下巴尖，理想主义，重感受多于重根基。晚年宜早做资产与关系的安排，别把安稳留到最后才想。',
        },
        {
          v: 'square', label: '方正', note: '下颏方，颌线硬',
          dims: { career: 2, wealth: 1, love: 0, health: 1, social: 0, mind: 2 },
          stop: 66, traits: ['意志硬', '认死理'],
          text: '下巴方，意志硬，认准的事能扛到底。也要允许自己改主意，坚持和固执只差一次复盘。',
        },
        {
          v: 'recede', label: '后缩', note: '下颏后收，侧面弱',
          dims: { career: -1, wealth: 0, love: -1, health: 0, social: -2, mind: 0 },
          stop: 44, traits: ['退一步', '不争'],
          text: '下巴略后，遇事习惯退一步。主动争取一次，结果常比想的好；退让要有底线，不然会退成习惯。',
        },
        {
          v: 'double', label: '肉厚／双下巴', note: '下颏与颈间肉厚',
          dims: { career: -1, wealth: 2, love: 1, health: 1, social: 1, mind: 0 },
          stop: 72, traits: ['生活安稳', '易满足'],
          text: '下停丰厚，生活安稳，是享福的相。注意代谢与作息，福气要配得上身体，才享得久。',
        },
      ],
    },
    {
      id: 'mole',
      num: '九',
      title: '面上的痣',
      hint: '选最明显的一颗即可；没有也可以选“无”。痣相只作旁证。',
      options: [
        {
          v: 'none', label: '无', note: '面上无显痣',
          dims: { career: 0, wealth: 0, love: 0, health: 1, social: 1, mind: 0 },
          traits: ['格局清简'],
          text: '面上无显痣，格局清简，少是非，也少戏剧性。日子多是平顺的，这本身就是好相。',
        },
        {
          v: 'forehead', label: '额头', note: '发际内或额中',
          dims: { career: 1, wealth: 0, love: 0, health: 0, social: 0, mind: 1 },
          traits: ['聪慧', '早年奔波'],
          text: '额上有痣，主聪慧与早年奔波。离乡发展往往更顺，换环境对你是加分项。',
        },
        {
          v: 'tear', label: '眼下／泪痣', note: '眼尾下方',
          dims: { career: 0, wealth: 0, love: 2, health: 0, social: 1, mind: 0 },
          traits: ['情感丰沛'],
          text: '眼下有痣，情感丰沛，容易被故事打动。选人先看长期行为，别被一次浪漫打动。',
        },
        {
          v: 'mouth', label: '嘴角', note: '口角附近',
          dims: { career: 0, wealth: 1, love: 1, health: 1, social: 1, mind: 0 },
          traits: ['口福', '桃花'],
          text: '嘴角有痣，口福与桃花都不缺。说话留三分，能省掉许多不必要的热闹。',
        },
        {
          v: 'chin', label: '下巴', note: '下颏或颌线',
          dims: { career: 0, wealth: 2, love: 1, health: 0, social: 0, mind: 0 },
          traits: ['田宅', '晚福'],
          text: '下巴有痣，主田宅与晚福。置业宜早规划，早一步安顿，晚十年从容。',
        },
        {
          v: 'cheek', label: '面颊', note: '颧颊一带',
          dims: { career: 0, wealth: 0, love: 0, health: 0, social: -1, mind: 0 },
          traits: ['是非偏多'],
          text: '颊上有痣，人际是非偏多。谨言即可化解大半，不传话、不站队，麻烦自然少。',
        },
      ],
    },
  ],
};

/* --------------------------------------------------------------------------
   手相
   -------------------------------------------------------------------------- */
export const PALM = {
  key: 'palm',
  name: '手相',
  glyph: '掌',
  title: '观掌',
  lead: '掌为心之表：掌型看路数，三线看身体、思路与情感，掌丘看能量落点。以惯用手为主，另一手为辅。',
  photoHint: '可上传掌心照，仅在本机对照；照片不参与识别。',
  questions: [
    {
      id: 'hand',
      num: '〇',
      title: '看哪只手',
      hint: '相学有“左手先天、右手后天”之说。左手看底色，右手看当下。',
      options: [
        {
          v: 'right', label: '惯用右手', note: '以右手为主，左手为辅',
          dims: {}, traits: [], text: '以右手为主、左手为辅：先天底子在左，后天作为在右。',
        },
        {
          v: 'left', label: '惯用左手', note: '以左手为主，右手为辅',
          dims: {}, traits: [], text: '以左手为主、右手为辅：先天底子在右，后天作为在左。',
        },
      ],
      meta: true,
    },
    {
      id: 'shape',
      num: '一',
      title: '手型',
      hint: '看掌与指的比例，以及骨节是否明显。',
      options: [
        {
          v: 'wood', label: '掌长指长', note: '掌薄指长，线条清',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 0, mind: 3 },
          traits: ['重精神', '审美好'], elem: '木',
          text: '木型手，指长掌薄，重精神与审美。适合以创意、研究、教育为业；对物质的要求不高，对环境的要求很高。',
        },
        {
          v: 'earth', label: '掌方指短', note: '掌厚实，指节方',
          dims: { career: 2, wealth: 2, love: 0, health: 2, social: 0, mind: 0 },
          traits: ['务实', '耐劳'], elem: '土',
          text: '土型手，掌厚指短，务实耐劳。靠日积月累见成果，不适合追快，适合做越老越值钱的事。',
        },
        {
          v: 'water', label: '掌圆指短', note: '掌肉软，指圆润',
          dims: { career: 0, wealth: 1, love: 2, health: 0, social: 3, mind: 0 },
          traits: ['感受力强', '人缘好'], elem: '水',
          text: '水型手，掌圆肉软，感受力强，人缘好。宜做与人打交道的事；也容易随环境变形，要有自己的定盘星。',
        },
        {
          v: 'metal', label: '骨节分明', note: '掌方，指节突',
          dims: { career: 3, wealth: 1, love: -1, health: 1, social: 0, mind: 1 },
          traits: ['讲规则', '重效率'], elem: '金',
          text: '金型手，骨节分明，讲规则、重效率。适合技术与管理；对“不专业”的容忍度低，容易急。',
        },
        {
          v: 'fire', label: '掌长指尖', note: '掌窄，指尖细',
          dims: { career: 1, wealth: 0, love: 1, health: -1, social: 2, mind: 2 },
          traits: ['行动快', '点子多'], elem: '火',
          text: '火型手，掌长指尖，行动快、点子多。需要有人帮你收口；一个人能起势，一群人才能成事。',
        },
      ],
    },
    {
      id: 'thick',
      num: '二',
      title: '掌的厚薄',
      hint: '掌心按下去有肉、有弹性，还是薄而见骨。',
      options: [
        {
          v: 'thick', label: '厚实有肉', note: '掌厚如棉，有弹性',
          dims: { career: 1, wealth: 1, love: 1, health: 2, social: 1, mind: 0 },
          traits: ['底气足', '抗压'],
          text: '掌厚如棉，底气足，抗压能力强，福气偏厚。底子好更要规律使用，别用熬夜换效率。',
        },
        {
          v: 'even', label: '匀称', note: '不厚不薄，掌肉均匀',
          dims: { career: 0, wealth: 0, love: 0, health: 1, social: 0, mind: 1 },
          traits: ['有节奏', '张弛有度'],
          text: '掌肉匀称，张弛有度，做事有节奏。这种手相最经得起长跑，不必羡慕爆发型。',
        },
        {
          v: 'thin', label: '薄而露骨', note: '掌薄，骨节显',
          dims: { career: 0, wealth: 0, love: 0, health: -2, social: 0, mind: 2 },
          traits: ['思虑多', '体力偏弱'],
          text: '掌薄见骨，思虑多、体力偏弱。把精力当预算来排，重要的事放在你状态最好的那两个小时。',
        },
      ],
    },
    {
      id: 'life',
      num: '三',
      title: '生命线',
      hint: '环绕拇指根部的弧线。看元气、耐力与生活节奏。',
      options: [
        {
          v: 'deep', label: '深长清晰', note: '弧线深，绕过大半拇指',
          dims: { career: 1, wealth: 0, love: 0, health: 3, social: 1, mind: 0 },
          traits: ['元气足', '恢复快'],
          text: '生命线深长，元气足，恢复快。底子好是优势，但好底子最容易被透支，别把它当无限额度。',
        },
        {
          v: 'shallow', label: '浅短', note: '线浅，长度偏短',
          dims: { career: 0, wealth: 0, love: 0, health: -1, social: 0, mind: 1 },
          traits: ['集中发力', '不耐久'],
          text: '生命线偏短浅，精力集中而不耐久。工作宜分段推进，别用“一次做完”的方式消耗自己。',
        },
        {
          v: 'broken', label: '有断口／岛纹', note: '线中段断开或成岛',
          dims: { career: 0, wealth: 0, love: 0, health: -2, social: 0, mind: 1 },
          traits: ['有转折', '需调养'],
          text: '生命线中段有断，主一次明显的环境或身体转折。定期体检，把转折当成提醒而不是判决。',
        },
        {
          v: 'double', label: '双生命线', note: '主线内侧另有一条',
          dims: { career: 1, wealth: 0, love: 1, health: 2, social: 2, mind: 0 },
          traits: ['恢复力强', '贵人缘'],
          text: '双生命线，恢复力与贵人缘都强。适合高压但短周期的岗位，冲刺后能迅速回血。',
        },
        {
          v: 'wide', label: '弧度开阔', note: '弧线大，绕拇指很开',
          dims: { career: 1, wealth: 0, love: 1, health: 2, social: 2, mind: 0 },
          traits: ['生命力旺', '外放'],
          text: '弧度开阔，生命力旺，性格也偏外放。你适合有空间的环境，被圈住会先烦后病。',
        },
      ],
    },
    {
      id: 'head',
      num: '四',
      title: '智慧线',
      hint: '掌中横向的线。看思路是务实、发散，还是两头兼顾。',
      options: [
        {
          v: 'straight', label: '平直而长', note: '横贯掌心，走势平',
          dims: { career: 2, wealth: 1, love: 0, health: 1, social: 0, mind: 3 },
          traits: ['逻辑强', '务实'],
          text: '智慧线平直，逻辑强、务实。适合工程、财务、法务一类要精确的事；也容易把生活过得像项目。',
        },
        {
          v: 'slope', label: '下垂向月丘', note: '尾端向掌根弯',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 1, mind: 2 },
          traits: ['想象力好', '灵感型'],
          text: '智慧线下垂，想象力好。适合创作与策划；注意别只活在脑内，做出来的才算数。',
        },
        {
          v: 'short', label: '短而直', note: '线短，止于掌中',
          dims: { career: 1, wealth: 0, love: 0, health: 1, social: 2, mind: -1 },
          traits: ['反应快', '决断快'],
          text: '智慧线短，反应快、决断快。适合执行岗；复杂决策要借外脑，别用速度代替判断。',
        },
        {
          v: 'join', label: '与生命线同源', note: '两线起端相连较长',
          dims: { career: 0, wealth: 0, love: 1, health: 1, social: 1, mind: 0 },
          traits: ['根扎得深', '独立较晚'],
          text: '两线同源较长，依赖家庭与原生环境，独立期来得晚，但根扎得深。离开舒适区要主动安排，不会自动发生。',
        },
        {
          v: 'fork', label: '末端分叉', note: '尾端分成两支',
          dims: { career: 1, wealth: 1, love: 1, health: 0, social: 1, mind: 2 },
          traits: ['能兼顾', '可跨界'],
          text: '智慧线尾分叉，能兼顾两种思路，适合跨界与统筹。缺点是容易同时开两条船，选一条当主航道。',
        },
      ],
    },
    {
      id: 'heart',
      num: '五',
      title: '感情线',
      hint: '小指下方横向的线。看情感表达、边界与亲密度。',
      options: [
        {
          v: 'up', label: '上扬至食指', note: '尾端挑向食指根',
          dims: { career: 0, wealth: 0, love: 2, health: 0, social: 2, mind: 0 },
          traits: ['重感情', '要求高'],
          text: '感情线上扬，重感情、要求也高。恋爱里容易先付出后计较，把期待早点说出口。',
        },
        {
          v: 'flat', label: '平直', note: '走势平，止于中指下',
          dims: { career: 0, wealth: 1, love: 0, health: 1, social: 1, mind: 2 },
          traits: ['理性', '边界清楚'],
          text: '感情线平直，理性、边界清楚。亲密关系稳定但需要主动表达，稳定不等于不用经营。',
        },
        {
          v: 'down', label: '下垂', note: '尾端向下弯',
          dims: { career: 0, wealth: 0, love: -1, health: 0, social: 1, mind: 0 },
          traits: ['心软', '易受伤'],
          text: '感情线下垂，心软、易受伤。学会先问自己要什么，再问对方能给什么。',
        },
        {
          v: 'fork', label: '末端分叉', note: '尾端分成两股',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 2, mind: 0 },
          traits: ['情感多线', '亲和'],
          text: '感情线尾分叉，情感多线并行。容易同时被几种关系牵扯，重要的一段要留出专门的时间。',
        },
        {
          v: 'chain', label: '断续／链状', note: '线身断断续续',
          dims: { career: 0, wealth: 0, love: -2, health: -1, social: 0, mind: 0 },
          traits: ['情绪起伏', '敏感'],
          text: '感情线断续，情绪起伏大。稳定的作息与稳定的关系，比一时的激情更能托住你。',
        },
      ],
    },
    {
      id: 'fate',
      num: '六',
      title: '事业线',
      hint: '自掌根向中指上升的纵线。看路径是否清晰、是否一条道走到黑。',
      options: [
        {
          v: 'clear', label: '清晰直上', note: '纵线直，少断',
          dims: { career: 3, wealth: 1, love: 0, health: 1, social: 0, mind: 1 },
          traits: ['目标感强', '一条主线'],
          text: '事业线直上，目标感强，一生有一条明确的主线。别因为别人换赛道就怀疑自己，你的优势在深不在广。',
        },
        {
          v: 'broken', label: '断续', note: '纵线中途换道',
          dims: { career: 1, wealth: 0, love: 0, health: 0, social: 1, mind: 1 },
          traits: ['路径多变', '能转身'],
          text: '事业线断续，路径多变。每次转向都在积累，不必强求一条直线；把可迁移的能力留住就行。',
        },
        {
          v: 'none', label: '浅淡／无', note: '几乎看不到纵线',
          dims: { career: -1, wealth: 0, love: 1, health: 0, social: 1, mind: 2 },
          traits: ['兴趣驱动', '自由'],
          text: '事业线浅淡，人生由兴趣推动。适合自由职业与多线并行；需要自己给自己定deadline，不然容易漂。',
        },
        {
          v: 'many', label: '多条并起', note: '数条纵线并行',
          dims: { career: 2, wealth: 1, love: 0, health: -1, social: 1, mind: 0 },
          traits: ['机会多', '身兼数职'],
          text: '多条事业线，机会多、身兼数职。同一时间只主攻一件，其余的记下来，不要让它们同时占用你。',
        },
      ],
    },
    {
      id: 'mount',
      num: '七',
      title: '掌丘',
      hint: '掌上肉最厚的那几处隆起。看能量往哪里走。',
      options: [
        {
          v: 'venus', label: '金星丘饱满', note: '拇指根厚',
          dims: { career: 0, wealth: 1, love: 2, health: 2, social: 1, mind: 0 },
          traits: ['热情', '有生活感'],
          text: '金星丘厚，热情、体力好，喜欢有温度的生活。别把热情全给别人，也留一份给自己。',
        },
        {
          v: 'jupiter', label: '木星丘高', note: '食指根隆',
          dims: { career: 2, wealth: 1, love: 0, health: 0, social: 1, mind: 1 },
          traits: ['志向大', '爱面子'],
          text: '木星丘高，志向大、爱面子。野心要配得上耐心，把“要被看见”换成“要做出东西”。',
        },
        {
          v: 'moon', label: '月丘发达', note: '掌根外侧丰',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 1, mind: 2 },
          traits: ['想象力', '同理心'],
          text: '月丘丰，想象力与同理心强。适合内容与疗愈类方向；共情要有开关，不然会被别人的情绪淹没。',
        },
        {
          v: 'flat', label: '掌心平坦', note: '掌丘不明显',
          dims: { career: 1, wealth: 0, love: 0, health: 1, social: 0, mind: 1 },
          traits: ['情绪稳定', '长期主义'],
          text: '掌丘平，情绪稳定，不喜起伏。适合长期主义的事；生活里可以主动加一点小变化，免得麻木。',
        },
        {
          v: 'full', label: '多丘饱满', note: '数处同时隆起',
          dims: { career: 1, wealth: 1, love: 1, health: 1, social: 2, mind: -1 },
          traits: ['兴趣广', '能量足'],
          text: '诸丘皆丰，兴趣广、能量足，容易分心。做减法最重要，一年只留三个真正想成的目标。',
        },
      ],
    },
    {
      id: 'finger',
      num: '八',
      title: '手指',
      hint: '看指的长短与食指、无名指的比例。',
      options: [
        {
          v: 'long', label: '手指修长', note: '指长过掌',
          dims: { career: 0, wealth: 0, love: 1, health: 0, social: 1, mind: 2 },
          traits: ['重细节', '先想后做'],
          text: '指长，重细节与思考，动手前先想清楚。想清楚是优点，想太久就成了拖延。',
        },
        {
          v: 'short', label: '短粗', note: '指短而实',
          dims: { career: 1, wealth: 1, love: 0, health: 1, social: 1, mind: 0 },
          traits: ['行动优先', '效率高'],
          text: '指短，行动优先，边做边改，效率高。适合需要快速试错的领域；复盘会让你走得更远。',
        },
        {
          v: 'index', label: '食指较长', note: '食指长于无名指',
          dims: { career: 2, wealth: 0, love: 0, health: 1, social: 0, mind: 2 },
          traits: ['自我要求高', '专业路线'],
          text: '食指偏长，重规则与自我要求，适合专业路线。对别人也容易按同一把尺子量，松一点关系会好很多。',
        },
        {
          v: 'ring', label: '无名指较长', note: '无名指长于食指',
          dims: { career: 1, wealth: 1, love: 1, health: 0, social: 2, mind: 0 },
          traits: ['敢冒险', '爱表现'],
          text: '无名指偏长，敢冒险、爱表现，适合销售与创业。风险要设上限，敢冲不等于不设底线。',
        },
        {
          v: 'pinky', label: '小指偏短', note: '小指不过无名指末节',
          dims: { career: 0, wealth: 0, love: 0, health: 0, social: -2, mind: 1 },
          traits: ['表达待练', '内秀'],
          text: '小指偏短，沟通与表达可再练。重要场合提前打草稿，你的内容不差，差的是让人听见。',
        },
      ],
    },
    {
      id: 'mark',
      num: '九',
      title: '特殊掌纹',
      hint: '掌中是否有十字、三角、星纹，或断掌。没有就选“无”。',
      options: [
        {
          v: 'none', label: '无', note: '掌纹清简',
          dims: { career: 0, wealth: 0, love: 0, health: 1, social: 1, mind: 0 },
          traits: ['主线清楚'],
          text: '掌纹清简，人生主线清楚，少无谓纠缠。清简不是单薄，是不把力气花在岔路上。',
        },
        {
          v: 'cross', label: '掌中十字', note: '掌心有十字纹',
          dims: { career: 1, wealth: 0, love: 0, health: 0, social: 0, mind: 2 },
          traits: ['直觉准', '有信念'],
          text: '掌心十字，直觉准，关键时刻相信第一判断。但直觉要靠经验喂，多做才有得准。',
        },
        {
          v: 'triangle', label: '三角纹', note: '掌中有三角',
          dims: { career: 1, wealth: 2, love: 0, health: 0, social: 0, mind: 1 },
          traits: ['有专长', '偏财'],
          text: '三角纹现，主偏财与专长。一门手艺能养活自己，别把时间全花在追热点上。',
        },
        {
          v: 'star', label: '星纹', note: '掌中有星形纹',
          dims: { career: 2, wealth: 1, love: 1, health: 0, social: 2, mind: 0 },
          traits: ['易被看见', '机会型'],
          text: '星纹，容易在某个节点被看见。机会来时别退，退了就轮到别人。',
        },
        {
          v: 'simian', label: '断掌', note: '感情线与智慧线合一',
          dims: { career: 3, wealth: 1, love: -2, health: 0, social: -1, mind: 2 },
          traits: ['意志极强', '爱憎分明'],
          text: '断掌，意志极强，认准就不回头。也要给别人留余地，硬度用对地方是定力，用错地方是伤人。',
        },
      ],
    },
  ],
};

/* --------------------------------------------------------------------------
   干支 · 五行
   -------------------------------------------------------------------------- */
export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const GAN_ELEM = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
export const ZHI_ELEM = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

export const NAYIN = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
  '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木',
  '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

export const HOURS = [
  { v: '子', label: '子时', range: '23 — 01' },
  { v: '丑', label: '丑时', range: '01 — 03' },
  { v: '寅', label: '寅时', range: '03 — 05' },
  { v: '卯', label: '卯时', range: '05 — 07' },
  { v: '辰', label: '辰时', range: '07 — 09' },
  { v: '巳', label: '巳时', range: '09 — 11' },
  { v: '午', label: '午时', range: '11 — 13' },
  { v: '未', label: '未时', range: '13 — 15' },
  { v: '申', label: '申时', range: '15 — 17' },
  { v: '酉', label: '酉时', range: '17 — 19' },
  { v: '戌', label: '戌时', range: '19 — 21' },
  { v: '亥', label: '亥时', range: '21 — 23' },
];

export const ELEM_ORDER = ['木', '火', '土', '金', '水'];

export const ELEM_INFO = {
  木: { key: 'wood', color: '#4F7355', trait: '生发', organ: '肝胆', season: '春', dims: { mind: 2, career: 1 } },
  火: { key: 'fire', color: '#A33B2B', trait: '明亮', organ: '心与小肠', season: '夏', dims: { social: 2, love: 1 } },
  土: { key: 'earth', color: '#9C7B45', trait: '承载', organ: '脾胃', season: '长夏', dims: { health: 2, wealth: 1 } },
  金: { key: 'metal', color: '#8A8778', trait: '收敛', organ: '肺与大肠', season: '秋', dims: { career: 2, mind: 1 } },
  水: { key: 'water', color: '#3F5A66', trait: '润下', organ: '肾与膀胱', season: '冬', dims: { wealth: 2, social: 1 } },
};

export const GE_NAMES = {
  '木火': '木火通明', '火土': '火土相生', '土金': '土金毓秀',
  '金水': '金水相涵', '水木': '水木清华',
};
export const GE_SINGLE = {
  木: '木秀于林', 火: '火明于野', 土: '土厚载物', 金: '金藏于矿', 水: '水润其下',
};

/* --------------------------------------------------------------------------
   罗盘 · 二十四山 · 八宅
   -------------------------------------------------------------------------- */
export const GUAS = {
  坎: { num: 1, dir: '北', elem: '水', glyph: '☵', group: '东四命', angle: 0, sub: '壬子癸' },
  艮: { num: 8, dir: '东北', elem: '土', glyph: '☶', group: '西四命', angle: 45, sub: '丑艮寅' },
  震: { num: 3, dir: '东', elem: '木', glyph: '☳', group: '东四命', angle: 90, sub: '甲卯乙' },
  巽: { num: 4, dir: '东南', elem: '木', glyph: '☴', group: '东四命', angle: 135, sub: '辰巽巳' },
  离: { num: 9, dir: '南', elem: '火', glyph: '☲', group: '东四命', angle: 180, sub: '丙午丁' },
  坤: { num: 2, dir: '西南', elem: '土', glyph: '☷', group: '西四命', angle: 225, sub: '未坤申' },
  兑: { num: 7, dir: '西', elem: '金', glyph: '☱', group: '西四命', angle: 270, sub: '庚酉辛' },
  乾: { num: 6, dir: '西北', elem: '金', glyph: '☰', group: '西四命', angle: 315, sub: '戌乾亥' },
};

export const MOUNTAINS = [
  { n: '子', deg: 0, elem: '水', gua: '坎', yin: '阳' },
  { n: '癸', deg: 15, elem: '水', gua: '坎', yin: '阴' },
  { n: '丑', deg: 30, elem: '土', gua: '艮', yin: '阴' },
  { n: '艮', deg: 45, elem: '土', gua: '艮', yin: '阳' },
  { n: '寅', deg: 60, elem: '木', gua: '艮', yin: '阳' },
  { n: '甲', deg: 75, elem: '木', gua: '震', yin: '阳' },
  { n: '卯', deg: 90, elem: '木', gua: '震', yin: '阴' },
  { n: '乙', deg: 105, elem: '木', gua: '震', yin: '阴' },
  { n: '辰', deg: 120, elem: '土', gua: '巽', yin: '阳' },
  { n: '巽', deg: 135, elem: '木', gua: '巽', yin: '阳' },
  { n: '巳', deg: 150, elem: '火', gua: '巽', yin: '阴' },
  { n: '丙', deg: 165, elem: '火', gua: '离', yin: '阳' },
  { n: '午', deg: 180, elem: '火', gua: '离', yin: '阴' },
  { n: '丁', deg: 195, elem: '火', gua: '离', yin: '阴' },
  { n: '未', deg: 210, elem: '土', gua: '坤', yin: '阴' },
  { n: '坤', deg: 225, elem: '土', gua: '坤', yin: '阳' },
  { n: '申', deg: 240, elem: '金', gua: '坤', yin: '阳' },
  { n: '庚', deg: 255, elem: '金', gua: '兑', yin: '阳' },
  { n: '酉', deg: 270, elem: '金', gua: '兑', yin: '阴' },
  { n: '辛', deg: 285, elem: '金', gua: '兑', yin: '阴' },
  { n: '戌', deg: 300, elem: '土', gua: '乾', yin: '阳' },
  { n: '乾', deg: 315, elem: '金', gua: '乾', yin: '阳' },
  { n: '亥', deg: 330, elem: '水', gua: '乾', yin: '阴' },
  { n: '壬', deg: 345, elem: '水', gua: '坎', yin: '阳' },
];

/* 双山地支：壬子→子、癸丑→丑……三合水法据此定局 */
const SHUANG_ZHI = {
  子: '子', 癸: '丑', 丑: '丑', 艮: '寅', 寅: '寅', 甲: '卯',
  卯: '卯', 乙: '辰', 辰: '辰', 巽: '巳', 巳: '巳', 丙: '午',
  午: '午', 丁: '未', 未: '未', 坤: '申', 申: '申', 庚: '酉',
  酉: '酉', 辛: '戌', 戌: '戌', 乾: '亥', 亥: '亥', 壬: '子',
};
MOUNTAINS.forEach((m) => { m.zhi = SHUANG_ZHI[m.n] || m.n; });

export const STARS = {
  生气: { name: '生气', star: '贪狼', elem: '木', good: true, level: '大吉', line: '主生机、进取与催丁财', use: '主卧、书房、大门' },
  天医: { name: '天医', star: '巨门', elem: '土', good: true, level: '吉', line: '主健康、贵人与调养', use: '卧室、长辈房、餐桌' },
  延年: { name: '延年', star: '武曲', elem: '金', good: true, level: '吉', line: '主寿元、婚姻和睦', use: '主卧、客厅主位' },
  伏位: { name: '伏位', star: '左辅', elem: '木', good: true, level: '小吉', line: '主稳定、守成与静养', use: '书房、静室、神位' },
  祸害: { name: '祸害', star: '禄存', elem: '土', good: false, level: '小凶', line: '主口舌、小人与拖延', use: '储物、卫浴、走廊' },
  六煞: { name: '六煞', star: '文曲', elem: '水', good: false, level: '凶', line: '主桃花、是非与情绪', use: '卫浴、储物、次要空间' },
  五鬼: { name: '五鬼', star: '廉贞', elem: '火', good: false, level: '大凶', line: '主火灾、官非与急躁', use: '厨房、卫浴，忌卧室' },
  绝命: { name: '绝命', star: '破军', elem: '金', good: false, level: '大凶', line: '主破财、疾病与失序', use: '储物、卫浴、厨房，忌久居' },
};

/* 大游年歌：自本卦起，顺后天八卦顺时针（乾坎艮震巽离坤兑）之外的七位 */
const RING = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑'];
const SONG = {
  乾: '六天五祸绝延生',
  坎: '五天生延绝祸六',
  艮: '六绝祸生延天五',
  震: '延生祸绝五天六',
  巽: '天五六祸生绝延',
  离: '六五绝延祸生天',
  坤: '天延绝生祸五六',
  兑: '生祸延绝六五天',
};
const CHAR2STAR = { 生: '生气', 天: '天医', 延: '延年', 祸: '祸害', 六: '六煞', 五: '五鬼', 绝: '绝命' };

/* 生成 宅卦 → { 方位卦: 星 } 的表 */
export const BAZHAI = (() => {
  const out = {};
  for (const home of RING) {
    const k = RING.indexOf(home);
    const map = { [home]: STARS.伏位 };
    for (let i = 1; i < 8; i++) {
      const pos = RING[(k + i) % 8];
      map[pos] = STARS[CHAR2STAR[SONG[home][i - 1]]];
    }
    out[home] = map;
  }
  return out;
})();

export const DIRS8 = [
  { v: '坎', label: '北', angle: 0 },
  { v: '艮', label: '东北', angle: 45 },
  { v: '震', label: '东', angle: 90 },
  { v: '巽', label: '东南', angle: 135 },
  { v: '离', label: '南', angle: 180 },
  { v: '坤', label: '西南', angle: 225 },
  { v: '兑', label: '西', angle: 270 },
  { v: '乾', label: '西北', angle: 315 },
];

export const CITIES = ['北京','上海','广州','深圳','天津','重庆','成都','杭州','南京','武汉','西安','沈阳','哈尔滨','长春','石家庄','太原','济南','郑州','合肥','长沙','南昌','福州','厦门','昆明','贵阳','南宁','海口','兰州','西宁','银川','乌鲁木齐','呼和浩特','拉萨','香港','澳门','台北','苏州','无锡','宁波','温州','东莞','佛山','珠海','汕头','泉州','烟台','潍坊','洛阳','襄阳','宜昌','绵阳','遵义','桂林','三亚','包头','唐山','徐州','常州','南通','嘉兴','义乌','昆山','江阴','常熟','张家港','慈溪','余姚','诸暨','温岭','瑞安','乐清','晋江','石狮','福清','南安','普宁','博罗','增城','从化','番禺','顺德','南海','新会','台山','开平','鹤山','四会','高要','惠东','花都'];
