import { Directive, ElementRef, Output, EventEmitter, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  private element = inject(ElementRef);
  @Output() clickOutside = new EventEmitter<void>();

  constructor() {
    fromEvent(document, 'click')
      .pipe(takeUntilDestroyed())
      .subscribe((event: Event) => {
        if (!this.element.nativeElement.contains(event.target)) {
          this.clickOutside.emit();
        }
      });
  }
}
