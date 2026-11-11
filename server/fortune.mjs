/* ==========================================================================
   fortune.mjs — 开运建议（按喜用五行推，纯文化娱乐）
   不给医疗、择业、投资的结论；食物与运动都带“量力而行”。
   ========================================================================== */

export const ELEM_LIFE = {
  木: {
    color: '青、绿、竹青',
    food: '芽菜、绿叶菜、少量酸味（柠檬、山楂）',
    sport: '拉伸、徒步、羽毛球',
    dir: '东',
    city: '杭州、苏州、南京等东部城市',
  },
  火: {
    color: '朱红、紫、暖橙',
    food: '红色果蔬、温热饮食（番茄、红枣、姜）',
    sport: '慢跑、舞蹈、球类',
    dir: '南',
    city: '广州、深圳、厦门等南方城市',
  },
  土: {
    color: '土黄、棕、米色',
    food: '根茎与谷物（山药、南瓜、小米）',
    sport: '力量训练、太极、登山',
    dir: '中部、西南、东北',
    city: '郑州、武汉、成都等中部城市',
  },
  金: {
    color: '白、银、浅金',
    food: '白色食物（百合、银耳、梨、白萝卜）',
    sport: '呼吸训练、器械、游泳',
    dir: '西、西北',
    city: '西安、兰州、乌鲁木齐等西部城市',
  },
  水: {
    color: '黑、藏蓝、灰',
    food: '豆类、海产、汤水（黑豆、海带）',
    sport: '游泳、骑行、长距离慢跑',
    dir: '北',
    city: '北京、天津、哈尔滨等北方城市',
  },
};

const NOTE = '颜色、饮食、运动、城市均按喜用五行推演，属传统文化娱乐；不是医疗或择业建议，过敏、慢性病、孕产请遵医嘱，运动量力而行。';

export function fortuneSheet(yong = [], dom = '') {
  const use = [...new Set(yong.filter((e) => ELEM_LIFE[e]))].slice(0, 2);
  const primary = use[0] || '土';
  const second = use[1] || primary;
  const a = ELEM_LIFE[primary];
  const b = ELEM_LIFE[second];

  return {
    use,
    avoid: dom,
    colors: b === a ? a.color : `${a.color}；次选 ${b.color}`,
    foods: b === a ? a.food : `${a.food}；可搭 ${b.food}`,
    sports: b === a ? a.sport : `${a.sport}；或 ${b.sport}`,
    direction: b === a ? a.dir : `${a.dir}为主，${b.dir}为辅`,
    cities: b === a ? a.city : `${a.city}；${b.city}`,
    note: NOTE,
  };
}
