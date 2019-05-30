import { Component, ViewEncapsulation, OnInit, Input, Output, EventEmitter, Renderer2 } from '@angular/core';
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

  @Input('modal-show')
  public modalVisible: boolean = false;

  @Input('modal-close')
  public modalCloseButton: HTMLElement;

  @Output('modal-closed')
  public onModalClosed: EventEmitter<void> = new EventEmitter();

  constructor(
    private renderer: Renderer2
  ) { }

  ngOnInit() {

    if ( ! this.modalCloseButton ) return;

    this.renderer.listen(this.modalCloseButton, 'click', () => {

      this.modalVisible = false;
      this.onModalClosed.emit();

    });

  }

}
