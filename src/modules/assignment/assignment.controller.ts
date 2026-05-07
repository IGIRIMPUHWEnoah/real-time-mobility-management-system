import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { ConfirmMatchDto } from './dto/confirm-match.dto';

@Controller('rides')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post(':id/confirm')
  async confirmMatch(
    @Param('id') rideId: string,
    @Body() confirmMatchDto: ConfirmMatchDto,
  ) {
    return await this.assignmentService.confirmMatch(rideId, confirmMatchDto);
  }
}
