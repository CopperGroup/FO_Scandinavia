import { Store } from "./store";

export const socials = `
                        <tr>
                        <td align="center" valign="top" style="padding-bottom: 20px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td align="center" valign="top" style="padding: 0 10px;">
                                <a href="${Store.social_media.instagram}" target="_blank">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" width="24" style="display: block; border: 0;">
                                </a>
                                </td>
                                <td align="center" valign="top" style="padding: 0 10px;">
                                <a href="${Store.social_media.facebook}" target="_blank">
                                    <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" width="24" style="display: block; border: 0;">
                                </a>
                                </td>
                                <td align="center" valign="top" style="padding: 0 10px;">
                                <a href="${Store.social_media.tik_tok}" target="_blank">
                                    <img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" alt="TikTok" width="24" style="display: block; border: 0;">
                                </a>
                                </td>
                            </tr>
                            </table>
                        </td>
                        </tr>
`

export const year_and_rights = `
                                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                                        © ${new Date().getFullYear()} ${Store.name}. Усі права захищені.
                                    </p>
`