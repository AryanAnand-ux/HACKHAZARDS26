import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

@Controller('api/v1/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerIngestionWorkflow() {
    // Run the ingestion workflow asynchronously to simulate background execution
    const runResult = await this.workflowsService.runIngestionWorkflow();
    return {
      success: true,
      message: 'Render Ingestion Workflow execution triggered successfully.',
      run: runResult,
    };
  }
}
