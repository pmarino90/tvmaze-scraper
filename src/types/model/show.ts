export interface Show {
  id: number;
  name: string;
  cast: CastMember[];
}

export interface CastMember {
  id: number;
  name: string;
  birthday: string;
}
