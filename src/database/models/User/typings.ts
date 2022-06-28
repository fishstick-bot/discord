import { Schema } from 'mongoose';

export interface ISurvivorSquadPreset {
  name: string;
  characterIds: string[];
  squadIds: string[];
  slotIndices: number[];
}

type AutoResearch =
  | 'fortitude'
  | 'offense'
  | 'resistance'
  | 'tech'
  | 'auto'
  | 'none';

export interface IEpicAccount {
  accountId: string;
  displayName: string;
  avatarUrl: string;

  autoDaily: boolean;
  autoFreeLlamas: boolean;
  autoResearch: AutoResearch;

  cachedFortitudeLevel: number;
  cachedOffenseLevel: number;
  cachedResistanceLevel: number;
  cachedTechLevel: number;

  survivorSquadPresets: Schema.Types.ObjectId[] | ISurvivorSquadPreset[];

  launcherToken: string;
  launcherRefreshToken: string;
  lastLauncherTokenRefresh: Date;
}

export interface IUser {
  id: string;

  premiumUntil: Date;
  isPartner: boolean;

  blacklisted: boolean;
  blacklistedAt?: Date;
  blacklistedReason?: string;

  epicAccounts: Schema.Types.ObjectId[] | IEpicAccount[];
}
