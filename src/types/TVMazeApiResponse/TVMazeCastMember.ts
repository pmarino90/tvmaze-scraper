export interface TVMazeCastMember {
  person: Person;
  character: Character;
  self: boolean;
  voice: boolean;
}
export interface Person {
  id: number;
  url: string;
  name: string;
  country: Country;
  birthday: string;
  deathday?: null;
  gender: string;
  image: Image;
  _links: Links;
}
export interface Country {
  name: string;
  code: string;
  timezone: string;
}
export interface Image {
  medium: string;
  original: string;
}
export interface Links {
  self: Self;
}
export interface Self {
  href: string;
}
export interface Character {
  id: number;
  url: string;
  name: string;
  image?: null;
  _links: Links;
}
