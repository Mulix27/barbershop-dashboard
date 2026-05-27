import { Pipe, PipeTransform } from '@angular/core';
 
/**
 * Pipe de utilidad: retorna el mínimo de un array de números.
 * Uso en template:  {{ [page*pageSize, filtered.length] | min }}
 */
@Pipe({ name: 'min' })
export class MinPipe implements PipeTransform {
  transform(value: number[]): number {
    return Math.min(...value);
  }
}
 