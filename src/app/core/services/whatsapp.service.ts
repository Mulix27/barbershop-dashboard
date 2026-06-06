import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {

  openChat(phone: string, message: string): void {
    const normalizedPhone = this.normalizeMexicanPhone(phone);

    if (!normalizedPhone) {
      alert('El cliente no tiene un número de WhatsApp válido.');
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;

    window.open(url, '_blank');
  }

  private normalizeMexicanPhone(phone: string): string {
    if (!phone) {
      return '';
    }

    const digits = phone.replace(/\D/g, '');

    if (digits.length === 10) {
      return `52${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('52')) {
      return digits;
    }

    return digits;
  }
}