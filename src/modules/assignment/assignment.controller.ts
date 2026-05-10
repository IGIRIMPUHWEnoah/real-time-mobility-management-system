import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { ConfirmMatchDto } from './dto/confirm-match.dto';

@ApiTags('Assignment')
@Controller('rides')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Atomically confirm a ride assignment', description: 'Locks the driver and updates status to ON_TRIP. Prevents double-booking.' })
  @ApiParam({ name: 'id', description: 'The UUID of the Ride to confirm' })
  async confirmMatch(
    @Param('id') rideId: string,
    @Body() confirmMatchDto: ConfirmMatchDto,
  ) {
    return await this.assignmentService.confirmMatch(rideId, confirmMatchDto);
  }
}
