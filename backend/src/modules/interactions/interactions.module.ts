import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Like])],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}
