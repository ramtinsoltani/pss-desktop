import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent {

  @Input('progress')
  public progress: number = 0;

  @Input('progress-threshold')
  public threshold: number = null;

  @Input('progress-color')
  public color: string;

  constructor() { }

}
