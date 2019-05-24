import { Component, OnInit, ViewEncapsulation, Input, ChangeDetectorRef } from '@angular/core';
import { style, state, animate, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fade', [
      state('void', style({
        opacity: 0
      })),
      transition('void <=> *', animate(100))
    ])
  ]
})
export class ModalComponent implements OnInit {

  @Input('modal-close')
  public closeButton: HTMLButtonElement;

  @Input('modal-hidden')
  public hidden: boolean = false;

  constructor(
    private detector: ChangeDetectorRef
  ) { }

  ngOnInit() {

    if ( ! this.closeButton ) return;

    this.closeButton.onclick = () => {

      this.hidden = true;
      this.detector.detectChanges();

    };

  }

}
