# The Calligraphy Art Club Membership Management System

The Calligraphy Art Club does not currently have a complete electronic membership system. Member information is scattered across different files, and membership fee payments rely on paper and handwritten records. As a result, the Club cannot answer basic questions such as "How many members do we have right now?" and "Who has paid this year?"

## Existing Tools and Registration Channels

- **Club website with an online registration form:** The Club has a website with a link to a Google Form. A new member can register by clicking the link and filling in the form.
- **Google Sheet as the member list:** Each Google Form submission automatically creates a new member record in the existing Google Sheet.
- **Payments recorded separately:** The membership fee payment is not recorded in the Google Sheet (or anywhere linked to the member record), so there is no single place showing both who registered and who has paid.
- **Paper registration still in use:** Alongside the online form, some new members still register on paper (see below).

## Current Pain Points

- **Outdated member list:** Member information is stored in a Google Sheet, but it is not kept up to date. The list is stale — many people no longer take part in Club activities — so the current membership list and each member's payment status cannot be confirmed.
- **Paper-based registration:** Despite the online form, some new members register on a sheet of paper, and these registrations are not consistently entered into the Google Sheet. For the past two years, Alex has recorded everything by hand.
- **Difficult payment reconciliation:** Payments are not linked to member records in the Google Sheet. Several payment methods are in use at the same time — cash, e-Transfer, credit card, and others. The treasurer has to verify each payment one by one to confirm the money was received, and cash payments require extra coordination.
- **Fragmented communication:** Members are contacted through mass emails and WeChat groups. There is no single master list — the email group list, the WeChat group list and the Google Sheet list are not in sync.
- **No event records:** Every event has on-site registration, but there is no quick way to verify whether someone is a member or eligible for the member price.
- **Unclear history:** No one can say how many members the Club has had in the past, or how many it has now.

## Goals

Build a membership management system. Once the system is live, the Club should be able to look up, at any time:

- How many members it has had in total historically, and how many active (paid-up) members it has currently / in the current year
- Who has paid this year, through which payment method, and whether the treasurer has confirmed the funds were received
- Who attended each Club event, and how much was collected at member vs. non-member rates
- Which members have birthdays this month, so the Club can send greetings or event invitations
