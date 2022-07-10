interface KeyValuePair {
  [key: string]: any;
}

interface ISTWMission {
  id: string;
  show: boolean;
  missionType: string;
  icon: string;
  area: string;
  biome: string;
  powerLevel: number;
  isGroupMission: boolean;
  modifiers: KeyValuePair[];
  rewards: KeyValuePair[];
}

export default ISTWMission;
