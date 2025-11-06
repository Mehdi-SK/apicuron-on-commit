import { Report } from "../types/report.schema.js";

interface Processor<TInput, TOutput> {
  process(input: TInput): TOutput
}

export interface ApicuronProcessor<TInput> extends Processor<TInput, Report[] | Promise<Report[]>> {}

