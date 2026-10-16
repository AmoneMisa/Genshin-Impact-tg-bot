# Client navigation artwork

Extracted without repainting from the supplied local client, using `scripts/l2j/extract-l2ui.py`. Original packages are read only.

| Published artwork | Original texture | Package | Source package SHA256 |
| --- | --- | --- | --- |
| `Icon_DF_MenuWnd_Clan.webp` | `Icon_DF_MenuWnd_Clan` | `L2UI_CT1.utx` | `a54f5c63376cfc382d5576cf0ae865c5452da755a051eefdda486215aa46e82e` |
| `chatting_option1.webp` | `chatting_option1` | `L2UI_CH3.utx` | `32c640b68550b1e9bd626adafa8db15cf4719a59faf39e9e0e682ec33dab6980` |

The clan shortcut uses the original top-left 36 × 36 region of its 64 × 64 texture, saved losslessly as `Icon_DF_MenuWnd_Clan-icon.webp`. The complete 16 × 16 chat-settings texture is retained as a source reference; the runtime system-chat button now uses the shared speech-bubble control glyph for clarity. Pixel SHA256: clan `2a404b04e8ac89ce8ab379ffe0622c13be729cbdae53c98fd188f5a254720a66`; chat `942416b1567717445966f41bb00a0150a0079c38b4a7c2c59945314e55578451`.

High Five has no dedicated auction menu shortcut. This project's auction action uses the existing original `icon-etc_adena_i00` asset from the shared L2 catalog; it is not presented as an original auction shortcut texture.
