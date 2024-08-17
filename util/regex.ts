

export function getUserMentionRegex() {
    return /<@!?(\d+)>/g
}
export function getUserIdCaptureRegex() {
    return /(\d{16,20})/g
}