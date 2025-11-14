import { debug, error, info, warning } from '@actions/core'

export class Logger {
  static info(message: string) {
    info(message)
  }

  static warning(message: string) {
    warning(message)
  }

  static debug(message: string) {
    debug(message)
  }

  static error(message: string) {
    error(message)
  }
}
