import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  importProductsWorkflowId,
  waitConfirmationProductImportStepId,
} from "@medusajs/medusa/core-flows"
import {
  Modules,
  TransactionHandlerType,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import type { IWorkflowEngineService } from "@medusajs/framework/types"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const workflowEngineService: IWorkflowEngineService = req.scope.resolve(
    Modules.WORKFLOW_ENGINE
  )
  const transactionId = req.params.transaction_id
  console.log("req.params", req.params)
  if (!transactionId) {
    res.status(400).json({
      message: "transaction_id is required",
    })
    return
  }

  await workflowEngineService.setStepSuccess({
    idempotencyKey: {
      action: TransactionHandlerType.INVOKE,
      transactionId,
      stepId: waitConfirmationProductImportStepId,
      workflowId: importProductsWorkflowId,
    },
    stepResponse: new StepResponse(true),
  })

  res.status(202).json({
    message: "Product import confirmed",
    params: req.params,
  })
}
