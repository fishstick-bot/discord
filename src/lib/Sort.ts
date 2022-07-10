const priority: {
  [key: string]: number;
} = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  gaminglegends: 6,
  shadow: 7,
  icon: 8,
  starwars: 9,
  lava: 10,
  slurp: 11,
  dc: 12,
  marvel: 13,
  dark: 14,
  frozen: 15,
  mythic: 16,
  stw: 17,
  crew: 18,
  exclusive: 19,
};

const Sort = (items: any) => {
  items.sort((a: any, b: any) => {
    let aRarity = a.rarity;
    let bRarity = b.rarity;

    if (a.isSTW) {
      aRarity = 'stw';
    }
    if (a.isCrew) {
      aRarity = 'crew';
    }
    if (a.isExclusive) {
      aRarity = 'exclusive';
    }

    if (b.isSTW) {
      bRarity = 'stw';
    }
    if (b.isCrew) {
      bRarity = 'crew';
    }
    if (b.isExclusive) {
      bRarity = 'exclusive';
    }

    const aPriority = priority[aRarity] || 0;
    const bPriority = priority[bRarity] || 0;

    // if (bPriority - aPriority == 0) {
    //     return a.name.localeCompare(b.name);
    // }

    return bPriority - aPriority;
  });

  return items;
};

export default Sort;
