import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { InteractionsModule } from '../interactions/interactions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post]), InteractionsModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
