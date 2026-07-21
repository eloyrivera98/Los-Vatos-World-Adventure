const supported = ['es', 'en'] as const
const systemLanguage = (navigator.languages?.[0] || navigator.language || 'es').toLowerCase()
export const language = supported.find(code => systemLanguage.startsWith(code)) || 'es'
export const locale = systemLanguage || 'es-ES'
export const mapLanguage = language

document.documentElement.lang = language

const activityTranslations: Record<string, Record<string, string>> = {
  es: { ACTIVATED: 'activó un cromo', FIRST_DISCOVERY: 'descubrió este cromo por primera vez', DISCOVERED: 'descubrió un cromo', EDITED: 'editó un cromo', REMOVED: 'retiró un cromo', ARCHIVED: 'archivó un cromo' },
  en: { ACTIVATED: 'activated a card', FIRST_DISCOVERY: 'was the first to discover this card', DISCOVERED: 'discovered a card', EDITED: 'edited a card', REMOVED: 'removed a card', ARCHIVED: 'archived a card' }
}
export const activityLabel = (kind: string) => activityTranslations[language][kind] || (language === 'es' ? 'realizó una acción' : 'performed an action')
export const formatDate = (value: string | Date) => new Intl.DateTimeFormat(locale).format(new Date(value))
export const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

export const authLocalization = language === 'es' ? {
  SIGN_IN: 'Iniciar sesión', SIGN_IN_ACTION: 'Entrar', SIGN_IN_DESCRIPTION: 'Introduce tu correo para acceder a tu cuenta', SIGN_IN_WITH: 'Iniciar sesión con',
  SIGN_UP: 'Crear cuenta', SIGN_UP_ACTION: 'Crear una cuenta', SIGN_UP_DESCRIPTION: 'Introduce tus datos para crear una cuenta',
  ALREADY_HAVE_AN_ACCOUNT: '¿Ya tienes una cuenta?', DONT_HAVE_AN_ACCOUNT: '¿No tienes una cuenta?',
  EMAIL: 'Correo electrónico', EMAIL_DESCRIPTION: 'Introduce el correo que utilizarás para acceder.', EMAIL_PLACEHOLDER: 'tu@correo.com', EMAIL_REQUIRED: 'El correo electrónico es obligatorio', INVALID_EMAIL: 'El correo no es válido',
  PASSWORD: 'Contraseña', PASSWORD_PLACEHOLDER: 'Contraseña', PASSWORD_REQUIRED: 'La contraseña es obligatoria', INVALID_PASSWORD: 'La contraseña no es válida', PASSWORD_TOO_SHORT: 'La contraseña es demasiado corta', PASSWORD_TOO_LONG: 'La contraseña es demasiado larga',
  NAME: 'Nombre', NAME_PLACEHOLDER: 'Nombre', NAME_DESCRIPTION: 'Introduce tu nombre o el nombre que quieras mostrar.', NAME_INSTRUCTIONS: 'Utiliza un máximo de 32 caracteres.',
  REMEMBER_ME: 'Recordarme en este dispositivo', FORGOT_PASSWORD: 'Recuperar contraseña', FORGOT_PASSWORD_LINK: '¿Has olvidado tu contraseña?', FORGOT_PASSWORD_ACTION: 'Enviar enlace de recuperación', FORGOT_PASSWORD_DESCRIPTION: 'Introduce tu correo para restablecer la contraseña',
  OR_CONTINUE_WITH: 'O continúa con', CONTINUE: 'Continuar', GO_BACK: 'Volver', CANCEL: 'Cancelar', DONE: 'Listo', REQUEST_FAILED: 'No se pudo completar la solicitud',
  INVALID_EMAIL_OR_PASSWORD: 'El correo o la contraseña no son correctos', INVALID_USERNAME_OR_PASSWORD: 'El usuario o la contraseña no son correctos', USER_ALREADY_EXISTS: 'Ya existe una cuenta con este correo', SESSION_EXPIRED: 'La sesión ha caducado. Vuelve a iniciar sesión.', UNKNOWN_ERROR: 'Ha ocurrido un error',
  VERIFY_YOUR_EMAIL: 'Verifica tu correo', VERIFY_YOUR_EMAIL_DESCRIPTION: 'Revisa tu bandeja de entrada y abre el enlace de verificación.', EMAIL_VERIFICATION: 'Revisa tu correo para encontrar el enlace de verificación.',
  RESET_PASSWORD: 'Restablecer contraseña', RESET_PASSWORD_ACTION: 'Guardar nueva contraseña', RESET_PASSWORD_DESCRIPTION: 'Introduce tu nueva contraseña', RESET_PASSWORD_SUCCESS: 'La contraseña se ha actualizado correctamente', NEW_PASSWORD: 'Nueva contraseña', NEW_PASSWORD_PLACEHOLDER: 'Nueva contraseña', CONFIRM_PASSWORD: 'Confirmar contraseña', CONFIRM_PASSWORD_PLACEHOLDER: 'Confirmar contraseña', PASSWORDS_DO_NOT_MATCH: 'Las contraseñas no coinciden',
  SIGN_OUT: 'Cerrar sesión', TRUST_DEVICE: 'Confiar en este dispositivo', ACCOUNT: 'Cuenta', SETTINGS: 'Ajustes', SAVE: 'Guardar', UPDATE: 'Actualizar', DELETE: 'Eliminar'
} : {}