import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AppService } from '@app/service/app';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  public showLogin: boolean = false;

  constructor(
    private app: AppService,
    private detector: ChangeDetectorRef
  ) { }

  ngOnInit() {

    this.app.onAuthChanged.subscribe(authenticated => {

      this.showLogin = ! authenticated;
      this.detector.detectChanges();

    });

    this.showLogin = ! this.app.authenticated;

  }

  public login(form: NgForm): void {

    if ( form.invalid ) return;

    this.app.login(form.value.username, form.value.password)
    .catch(console.error);

  }

}
