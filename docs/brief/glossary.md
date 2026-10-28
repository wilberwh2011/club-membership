# Glossary / 术语表

Canonical terms for the Calligraphy Art Club Membership Management System. Use these exact terms in specs, code, and the bilingual UI.

| English | 中文 | Meaning |
|---|---|---|
| Club | 俱乐部 | The Calligraphy Art Club |
| Member | 会员 | A person registered with the Club |
| Member number | 会员编号 | The unique number the system assigns to each member record; never changed or reused |
| Active member | 活跃会员 | A member who has paid the membership fee for the previous fiscal year or the current fiscal year (per brief; edge cases to confirm in clarify) |
| Inactive member | 非活跃会员 | A member who has not paid for the previous fiscal year (and not yet for the current one) |
| Fiscal year | 财年 / 会计年度 | October 1 to September 30 of the following year; also the membership year |
| Individual membership | 个人会员 | One member record covering one person (currently $20) |
| Family membership | 家庭会员 | One member record (the primary contact) covering a family, however many people; type affects only the fee (currently $40) |
| Membership type | 会员类型 | Individual or family; determines the fee amount only |
| Birthday | 生日 | Optional; month and day only, no year; provided voluntarily |
| Membership dues / fee | 会费 | The fee a member pays for a membership year |
| Payment | 缴费记录 | A record of a dues or event payment: amount, method, date, reference |
| Payment method | 缴费方式 | Cash (现金), e-Transfer (电子转账), credit card (信用卡), other |
| Payment confirmation | 到账确认 | The treasurer's confirmation that the funds were actually received |
| Treasurer | 会计 / 财务 | The Club officer who checks, marks, and confirms payments; can view but not change member records |
| EC (Executive Committee) member | 理事 / 执委 | A Club role that can register members on someone's behalf, look up members, and update member records; does not check or mark payments |
| Admin | 管理员 | A Club role that can do everything, including deleting member records and managing which Club users hold which Club role |
| Club user | 俱乐部用户 | A person who signs in to use the registry and holds one or more Club roles; not the same as a member record, although one person may be both |
| Club role | 俱乐部角色 | The permissions a Club user holds: Admin, EC member, or treasurer; a Club user may hold more than one |
| AGM (Annual General Meeting) | 年会 / 会员大会 | The Club's yearly general meeting, where many members pay their fee |
| Self-registration | 自助注册 | A new member registering themselves online |
| Registration event | 注册活动名称 | The Club event at which a member registered; "N/A" (不适用) if the registration was not taken during an event |
| Duplicate registration attempt | 重复注册 | A registration that uses an email or phone already belonging to an existing member record; it is refused |
| Note | 备注 | Additional information an EC member or Admin adds to a member record when updating it |
| Change history | 变更记录 | The append-only record of who changed what on a member record (or Club role), when, and the old and new values |
| Delete (member record) | 删除（会员记录） | Admin-only permanent removal of a test, junk, or mistaken member record; only a deletion entry with the member number and name remains in the change history |
| Event | 活动 | A Club activity with on-site registration |
| Check-in | 现场登记 | Recording attendance at an event |
| Member price / non-member price | 会员价 / 非会员价 | Event pricing based on member status |
| Registration form | 报名表 / 入会表 | The system's registration form, used both for self-registration and by EC members registering someone; the only registration channel once existing records are consolidated (the Google Form runs alongside it until then) |

> Chinese wording confirmed by the Club owner on 2026-10-28 (Active member → 活跃会员, Inactive member → 非活跃会员; all other terms confirmed as listed).
