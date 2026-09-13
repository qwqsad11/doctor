import { IsIn, IsString, Length } from "class-validator";
export class RespondConferenceDto {
  @IsIn(["accept", "decline"]) response: "accept" | "decline";
}
export class ConferenceOpinionDto {
  @IsString() @Length(1, 5000) content: string;
}
