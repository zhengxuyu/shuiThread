#!/usr/bin/env python3
"""Builds public/legal/cancellation-notice.pdf, attached to every order confirmation.
Run with reportlab installed after changing the seller details or the wording."""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

SELLER = 'CARBONKITE LTD'
ADDRESS = '28 Tersha Street, Richmond, TW9 2LY, United Kingdom'
EMAIL = 'hello@shuithread.com'
OUT = Path(__file__).resolve().parent.parent / 'public' / 'legal' / 'cancellation-notice.pdf'

ink = HexColor('#0D0D0D')
title = ParagraphStyle('t', fontName='Times-Roman', fontSize=22, leading=26, textColor=ink, spaceAfter=4)
head = ParagraphStyle('h', fontName='Times-Bold', fontSize=13, leading=17, textColor=ink, spaceBefore=14, spaceAfter=4)
body = ParagraphStyle('b', fontName='Times-Roman', fontSize=11, leading=15.5, textColor=ink, spaceAfter=7)
line = ParagraphStyle('l', parent=body, spaceAfter=15)

story = [
    Paragraph('Shui Thread: your right to cancel', title),
    Paragraph(f'Shui Thread is operated by {SELLER}, {ADDRESS}, the seller of your order.', body),
    Paragraph('Right to cancel', head),
    Paragraph('You may cancel this contract without giving a reason within 14 days of the day you, or someone you name, receive the goods. If your order contains several pieces delivered on different days, the 14 days run from the day you receive the last one.', body),
    Paragraph(f'To cancel, tell {SELLER} ({ADDRESS}; {EMAIL}) with a clear statement. You can use the Request a refund button on your order page, or the form below, but you do not have to. To meet the deadline, you only need to send your notice before the 14 days end.', body),
    Paragraph('Effects of cancellation', head),
    Paragraph('If you cancel, send the goods back without undue delay and within 14 days of telling us. <b>You pay the direct cost of returning them.</b>', body),
    Paragraph('We will refund all payments received, using your original payment method, within 14 days of receiving the goods or proof that you sent them, whichever is sooner. We may reduce the refund for any loss in value caused by handling beyond what was needed to establish the nature, characteristics and functioning of the goods.', body),
    Paragraph('This does not affect your rights if a piece is faulty or not as described; in that case we pay for the return. Full details: shuithread.com/returns.html', body),
    Paragraph('Cancellation form', head),
    Paragraph('Complete and return this form only if you wish to cancel the contract.', body),
    Paragraph(f'To: {SELLER}, {ADDRESS}, {EMAIL}', body),
    Paragraph('I/We hereby give notice that I/We cancel my/our contract of sale of the following goods:', line),
    Paragraph('Ordered on / received on:', line),
    Paragraph('Name of consumer(s):', line),
    Paragraph('Address of consumer(s):', line),
    Paragraph('Signature of consumer(s) (only if this form is sent on paper):', line),
    Paragraph('Date:', line),
]
OUT.parent.mkdir(parents=True, exist_ok=True)
SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=22*mm, rightMargin=22*mm, topMargin=20*mm, bottomMargin=18*mm,
                  title='Shui Thread: your right to cancel', author=SELLER).build(story)
