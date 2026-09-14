import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags("Audit Log")
@ApiBearerAuth()
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: "List audit logs (administrators only)" })
  findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }
}
