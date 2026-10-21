# The Calligraphy Art Club Membership Management System

The Calligraphy Art Club does not currently have a complete electronic membership system. Member information is scattered across different files, and membership fee payments rely on paper and handwritten records, or on Club admins (EC / Executive Committee members) checking the e-Transfer notifications received in the Club's Google email inbox to confirm payment. As a result, the Club cannot answer basic questions such as "How many members do we have right now?" and "Who has paid this year?"

## Existing Tools and Registration Channels

- **Club website with an online registration form:** The Club has a website with a link to a Google Form. A new member can register by clicking the link and filling in the form.
- **Google Sheet as the member list:** Each Google Form submission automatically creates a new member record in the existing Google Sheet.
- **Microsoft Excel Sheet as the member list:** There is a separate Microsoft Excel sheet hosting previous members information. It is not fully synced with the latest registration data in the Google Sheet. EC members recorded some new members on this sheet at Club events when those members did not register online.
- **Payments recorded separately:** The membership fee payment is not recorded in the Google Sheet. Some fees, including annual membership fees and event participation fees, were recorded on the Microsoft Excel sheet, or written on paper. No fee payment is reliably linked to a consolidated member record, so there is no single place showing both who registered and who has paid.
- **Paper registration still in use:** Alongside the online form, some new members still register on paper (recorded on paper by Alex). These records were not transferred to either the Google Form/Sheet or the Microsoft Excel sheet.

## Current Pain Points

- **Outdated member list:** Member information is stored in different places, the Google Sheet, the Microsoft Excel sheet, on paper. They are not consistent and not kept up to date on any source. The Microsoft Excel sheet list is stale — many people no longer take part in Club activities — so the current membership list and each member's payment status cannot be confirmed.
- **Paper-based registration:** Despite the online form, some new members register on a sheet of paper, and these registrations are not consistently entered into the Google Sheet, and may or may not be updated in Microsoft Excel sheet later. For the past two years, Alex has recorded everything by hand.
- **Difficult payment reconciliation:** Payments are not linked to member records in the Google Sheet. Several payment methods are in use at the same time — cash, e-Transfer, and credit card. The treasurer has to verify each payment one by one to confirm the money was received, and cash payments require extra coordination.
- **Fragmented communication:** Members are contacted through mass emails and WeChat groups. There is no single master list — the email group list, the WeChat group list, the Microsoft Excel sheet and the Google Sheet list are not in sync.
- **No electronic event records:** Every event has on-site registration, but there is no quick way to verify whether someone is a member or eligible for the member price. Some people joined the Club at events. Event records were written on paper including member or non-member people and their paid event fees. None of this information is in electronic format.
- **Unclear history:** No one can say how many members the Club has had in the past, or how many it has now.

## Goals

Build a membership management system.
The system should allow a new member to do self-registration, or a Club admin / EC member can register a new member. The system should record membership fee status. The system should record events including participating status of members and non-members and fee paid for the events.

Once the system is live, the Club should be able to look up, at any time:

- How many members it has had in total historically, and how many active (paid-up) members it has currently / in the current year
- Who has paid this year, through which payment method, and whether the treasurer has confirmed the funds were received
- Who attended each Club event, and how much was collected at member vs. non-member rates
- Which members have birthdays this month, so the Club can send greetings or event invitations

## Some club context

- The Club's fiscal year runs from October 1 to September 30 of the following year.
- If a member didn't pay the membership fee for the last fiscal year, they are considered inactive. If a member paid for last fiscal year or already for the current fiscal year, they are considered as active member. We are expecting the active member to pay the membership fee on AGM or during the events in the current fiscal year.
- A membership can be a family or an individual. The membership fee for a family is currently $40 and an individual membership is $20.
