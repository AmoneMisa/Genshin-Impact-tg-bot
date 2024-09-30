export type SettingsButtonType = {
    flag: 0 | 1,
    button: {
        text: "Выкл" | "Вкл",
        callback_data: string
    }
}